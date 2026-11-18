/* eslint-disable import/no-unresolved */
// Edge Function: receives a report from the app, checks it, and emails the team. Nothing is stored.
//
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Keep in sync with data/reportReasons.ts in the app.
const REASON_LABELS: Record<string, string> = {
  harassment: 'Harassment or bullying',
  hate: 'Hateful or discriminatory',
  threats: 'Threats or violence',
  sexual: 'Sexual or unwanted content',
  scam: 'Scam or payment request',
  unsafe: 'Unsafe or illegal',
  spam: 'Spam or misleading',
  impersonation: 'Fake or impersonating account',
  inappropriate: 'Offensive or inappropriate',
  other: 'Something else',
};
const ALLOWED_REASONS: Record<string, string[]> = {
  post: ['scam', 'unsafe', 'inappropriate', 'spam', 'other'],
  message: ['harassment', 'hate', 'threats', 'sexual', 'scam', 'unsafe', 'spam', 'other'],
  profile: ['impersonation', 'inappropriate', 'harassment', 'scam', 'other'],
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();

// Best-effort spam brake: 5 reports per person per hour. It lives in memory, so it resets when
// the function restarts and is not shared between instances. Fine at our size; not a hard guarantee.
const recent = new Map<string, number[]>();
function tooMany(userId: string) {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter(t => now - t < 3_600_000);
  if (list.length >= 5) { recent.set(userId, list); return true; }
  list.push(now);
  recent.set(userId, list);
  return false;
}

// Best-effort: blocks repeat reports of the same thing for 24 hours (resets if the function restarts).
const sent = new Map<string, number>();
function isDuplicate(key: string) {
  const now = Date.now();
  for (const [k, t] of sent) if (now - t > 86_400_000) sent.delete(k);
  return sent.has(key);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  // Only used to check the caller's login and look up the reported user's email.
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Who is calling? Must be a confirmed @uwaterloo.ca account.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const me = auth.user;
  if (!me || !me.email_confirmed_at || !(me.email ?? '').toLowerCase().endsWith('@uwaterloo.ca')) {
    return reply(401, { error: 'Sign in to send a report.' });
  }
  // Table reads run as the signed-in user, exactly like the app does, so they follow the same
  // database rules (the service role has no table grants in this project).
  const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const lookupFailed = (what: string, error: { message: string }) => {
    console.error(`submit-report: ${what} lookup failed:`, error.message);
    return reply(500, { error: 'Could not send your report. Please try again.' });
  };

  // 2. Validate the request.
  const body = await req.json().catch(() => null);
  const context = body?.context;
  const reason = body?.reason;
  const reportedUserId = body?.reportedUserId;
  const postId = body?.postId ?? null;
  const conversationId = body?.conversationId ?? null;
  const details = typeof body?.details === 'string' ? body.details.trim() : '';

  if (!ALLOWED_REASONS[context]?.includes(reason)) return reply(400, { error: 'Choose a reason for your report.' });
  if (typeof reportedUserId !== 'string' || !UUID.test(reportedUserId)) return reply(400, { error: 'That user could not be found.' });
  if (reportedUserId === me.id) return reply(400, { error: 'You cannot report yourself.' });
  if (details.length > 1000) return reply(400, { error: 'Please keep the description under 1000 characters.' });
  if (reason === 'other' && !details) return reply(400, { error: 'Tell us what happened.' });
  if (context === 'post' && !(typeof postId === 'string' && UUID.test(postId))) return reply(400, { error: 'That post could not be found.' });
  if (context === 'message' && !(typeof conversationId === 'string' && UUID.test(conversationId))) return reply(400, { error: 'That conversation could not be found.' });

  // 3. Check the report points at something real, so nobody can email us made-up reports.
  let postTitle = '';
  let messageLines = '';
  if (context === 'post') {
    const { data: post, error } = await db.from('posts').select('title, author_id').eq('id', postId).maybeSingle();
    if (error) return lookupFailed('post', error);
    if (!post || post.author_id !== reportedUserId) return reply(400, { error: 'That post could not be found.' });
    postTitle = oneLine(post.title);
  } else if (context === 'message') {
    const { data: members, error } = await db.from('conversation_participants').select('user_id').eq('conversation_id', conversationId);
    if (error) return lookupFailed('conversation', error);
    const ids = (members ?? []).map(m => m.user_id);
    if (!ids.includes(me.id) || !ids.includes(reportedUserId)) return reply(400, { error: 'That conversation could not be found.' });
  } else {
    const { data: profile, error } = await db.from('profiles').select('id').eq('id', reportedUserId).maybeSingle();
    if (error) return lookupFailed('profile', error);
    if (!profile) return reply(400, { error: 'That user could not be found.' });
  }

  const dedupeKey = [me.id, context, reportedUserId, postId ?? '', conversationId ?? ''].join(':');
  if (isDuplicate(dedupeKey)) {
    return reply(429, { error: 'You already reported this. Our team will review it.' });
  }

  if (tooMany(me.id)) return reply(429, { error: 'You have sent several reports recently. Please try again later.' });

  // 4. Gather names, emails and (for conversations) the latest messages.
  const { data: profiles } = await db.from('profiles').select('id, name').in('id', [me.id, reportedUserId]);
  const nameOf = (id: string) => oneLine(profiles?.find(p => p.id === id)?.name) || 'Unknown';
  const { data: reported } = await admin.auth.admin.getUserById(reportedUserId);

  if (context === 'message') {
    const { data: messages } = await db.from('messages').select('sender_id, content, timestamp')
      .eq('conversation_id', conversationId).order('timestamp', { ascending: false }).limit(5);
    messageLines = (messages ?? []).reverse()
      .map(m => `  [${m.timestamp}] ${nameOf(m.sender_id)}: ${String(m.content).slice(0, 500)}`).join('\n');
  }

  // 5. Email the team.
  const label = REASON_LABELS[reason];
  const subject = `[This4That report] ${context}: ${label}`;
  const text =
    `A user report needs review.\n\n` +
    `Where: ${context}\n` +
    `Reason: ${label}\n\n` +
    `Reported user: ${nameOf(reportedUserId)} <${reported?.user?.email ?? 'unknown'}> [${reportedUserId}]\n` +
    `Reported by:   ${nameOf(me.id)} <${me.email}> [${me.id}]\n` +
    (postId ? `Post: ${postTitle} [${postId}]\n` : '') +
    (conversationId ? `Conversation: [${conversationId}]\n` : '') +
    `Time: ${new Date().toISOString()}\n\n` +
    `Details from reporter:\n${details || '(none)'}\n` +
    (messageLines ? `\nLatest messages in the conversation (oldest first):\n${messageLines}\n` : '');

  const host = Deno.env.get('SMTP_HOST');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const from = Deno.env.get('REPORTS_FROM');
  const to = Deno.env.get('REPORTS_TO');
  if (!host || !user || !pass || !from || !to) {
    console.error('submit-report: SMTP secrets are missing');
    return reply(500, { error: 'Reporting is not set up yet. Please try again later.' });
  }
  const port = Number(Deno.env.get('SMTP_PORT') ?? 465);

  try {
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transport.sendMail({ from, to: to.split(',').map(s => s.trim()), subject, text });
    sent.set(dedupeKey, Date.now());
  } catch (error) {
    console.error('submit-report: email failed', error);
    console.error('smtp config seen', { host, port, user, passLength: pass.length });
    return reply(502, { error: 'Could not send your report. Please try again.' });
  }
  return reply(200, { ok: true });
});
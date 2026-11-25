/* eslint-disable import/no-unresolved */
import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREVIEW_CHAR_LIMIT = 100;
const WEB_APP_ORIGINS = new Set(['http://localhost:8081', 'https://this4that.vercel.app']);
const oneLine = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 100);
const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => HTML_ESCAPE[char] ?? char);
function previewText(value: string) {
  const characters = Array.from(value);
  if (characters.length <= PREVIEW_CHAR_LIMIT) return value;
  return `${characters.slice(0, PREVIEW_CHAR_LIMIT).join('').trimEnd()}…`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth, error: authError } = token ? await admin.auth.getUser(token) : { data: { user: null }, error: null };
  const sender = auth.user;
  if (authError || !sender?.email_confirmed_at || !(sender.email ?? '').toLowerCase().endsWith('@uwaterloo.ca')) {
    return reply(401, { error: 'Sign in to notify a message recipient.' });
  }

  const db = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const body = await req.json().catch(() => null);
  const messageId = body?.messageId;
  if (typeof messageId !== 'string' || !UUID.test(messageId)) return reply(400, { error: 'That message could not be found.' });

  const { data: message, error: messageError } = await db.from('messages').select('id, conversation_id, sender_id, content')
    .eq('id', messageId).maybeSingle();
  if (messageError) {
    console.error('notify-message: message lookup failed:', messageError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }
  if (!message || message.sender_id !== sender.id) return reply(404, { error: 'That message could not be found.' });

  const { data: participants, error: participantsError } = await db.from('conversation_participants')
    .select('user_id').eq('conversation_id', message.conversation_id);
  if (participantsError) {
    console.error('notify-message: participant lookup failed:', participantsError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }
  const participantIds = (participants ?? []).map(participant => participant.user_id);
  if (participantIds.length !== 2 || !participantIds.includes(sender.id)) {
    return reply(404, { error: 'That message could not be found.' });
  }
  const recipientId = participantIds.find(userId => userId !== sender.id);
  if (!recipientId) return reply(404, { error: 'That message could not be found.' });

  const { data: recipientData, error: recipientError } = await admin.auth.admin.getUserById(recipientId);
  const recipient = recipientData.user;
  if (recipientError) {
    console.error('notify-message: recipient lookup failed:', recipientError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }
  if (!recipient?.email_confirmed_at || !(recipient.email ?? '').toLowerCase().endsWith('@uwaterloo.ca')) {
    return reply(404, { error: 'That message could not be found.' });
  }

  const { data: preference, error: preferenceError } = await admin.from('message_notification_preferences')
    .select('email_enabled').eq('user_id', recipientId).maybeSingle();
  if (preferenceError) {
    console.error('notify-message: notification preference lookup failed:', preferenceError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }
  if (preference && !preference.email_enabled) return reply(200, { ok: true, skipped: true });

  const { data: profiles, error: profilesError } = await db.from('profiles').select('id, name').in('id', [sender.id, recipientId]);
  if (profilesError) {
    console.error('notify-message: profile lookup failed:', profilesError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }
  const senderName = oneLine(profiles?.find(profile => profile.id === sender.id)?.name) || 'A student';
  const senderNames = senderName.split(/\s+/).filter(Boolean);
  const senderInitials = senderNames.length > 1
    ? `${Array.from(senderNames[0])[0]}${Array.from(senderNames.at(-1)!)[0]}`.toUpperCase()
    : Array.from(senderName)[0].toUpperCase();
  const messagePreview = previewText(message.content);

  const host = Deno.env.get('SMTP_HOST');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const from = Deno.env.get('MESSAGES_FROM') ?? user;
  if (!host || !user || !pass || !from) {
    console.error('notify-message: SMTP secrets are missing');
    return reply(503, { error: 'Email notifications are not set up yet.' });
  }

  const { error: claimError } = await admin.from('message_email_deliveries')
    .insert({ message_id: message.id, recipient_id: recipientId });
  if (claimError?.code === '23505') return reply(200, { ok: true, duplicate: true });
  if (claimError) {
    console.error('notify-message: delivery claim failed:', claimError.message);
    return reply(500, { error: 'Could not prepare the email notification.' });
  }

  try {
    const port = Number(Deno.env.get('SMTP_PORT') ?? 465);
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const origin = req.headers.get('origin') ?? '';
    const chatPath = `chat/${encodeURIComponent(message.conversation_id)}`;
    const chatUrl = WEB_APP_ORIGINS.has(origin) ? `${origin}/${chatPath}` : `this4that://${chatPath}`;
    const safeSenderName = escapeHtml(senderName);
    const safeSenderInitials = escapeHtml(senderInitials);
    const safeMessagePreview = escapeHtml(messagePreview);
    const safeChatUrl = escapeHtml(chatUrl);
    await transport.sendMail({
      from,
      to: recipient.email,
      subject: `New message from ${senderName} on This4That`,
      text: `${senderName} sent you a message:\n\n${messagePreview}\n\nRead and reply: ${chatUrl}\n\nYou can turn off message email alerts from the Messages screen.`,
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f4f4;color:#20151f;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;">
      <tr><td style="padding:36px 40px;">
        <div style="margin-bottom:26px;font-size:15px;line-height:20px;font-weight:700;">This4That</div>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
          <tr>
            <td valign="middle" style="width:56px;height:56px;border-radius:50%;background:#ffe1e5;color:#76223a;text-align:center;font-size:20px;line-height:56px;font-weight:700;">${safeSenderInitials}</td>
            <td valign="middle" style="padding-left:16px;">
              <div style="font-size:28px;line-height:34px;font-weight:700;">${safeSenderName}</div>
              <div style="color:#625b62;font-size:15px;line-height:21px;">sent you a message</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;background:#ffe3e7;border-radius:22px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0;font-size:19px;line-height:29px;white-space:pre-wrap;word-break:break-word;">${safeMessagePreview}</p>
          </td></tr>
        </table>
        <a href="${safeChatUrl}" style="display:inline-block;padding:15px 28px;border-radius:12px;background:#45bca9;color:#111111;text-decoration:none;font-size:15px;line-height:20px;font-weight:700;">Read and reply</a>
        <p style="margin:28px 0 6px;color:#716a74;font-size:12px;line-height:18px;">Button not working? Copy and paste this link into your browser:</p>
        <p style="margin:0;color:#716a74;font-size:12px;line-height:18px;word-break:break-all;">${safeChatUrl}</p>
        <p style="margin:18px 0 0;color:#716a74;font-size:12px;line-height:18px;">You can turn off message email alerts from the Messages screen.</p>
      </td></tr>
    </table>
  </body>
</html>`,
    });
  } catch (error) {
    console.error('notify-message: email delivery failed:', error);
    const { error: cleanupError } = await admin.from('message_email_deliveries').delete().eq('message_id', message.id);
    if (cleanupError) console.error('notify-message: could not release delivery claim:', cleanupError.message);
    return reply(502, { error: 'Could not deliver the email notification.' });
  }

  return reply(200, { ok: true });
});

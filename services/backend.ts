/** Opt-in real APIs. Mock screens do not import this module. RLS is the authority for access. */
import { getSupabase } from '../lib/supabase';
import type { PostInput, ProfileInput } from '../types/database';

async function userId() {
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in before using backend APIs.');
  return data.user.id;
}
function page(offset: number, limit: number) {
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Use a nonnegative offset and a limit between 1 and 100.');
  }
  return [offset, offset + limit - 1] as const;
}
export async function getProfile(id: string) {
  const { data, error } = await getSupabase().from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data; // Public profile excludes email and user-editable verification flags.
}
export async function createMyProfile(input: ProfileInput) {
  const { data, error } = await getSupabase().from('profiles').insert({ ...input, id: await userId() }).select().single();
  if (error) throw error;
  return data;
}
export async function updateMyProfile(input: Partial<ProfileInput>) {
  const { data, error } = await getSupabase().from('profiles').update(input).eq('id', await userId()).select().single();
  if (error) throw error;
  return data;
}
export async function getPosts({ offset = 0, limit = 20, category, type }: { offset?: number; limit?: number; category?: string; type?: PostInput['type'] } = {}) {
  let query = getSupabase().from('posts').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
  if (category) query = query.eq('category', category);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.range(...page(offset, limit));
  if (error) throw error;
  return data;
}
export async function getPost(id: string) {
  const { data, error } = await getSupabase().from('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function createPost(input: PostInput) {
  const { data, error } = await getSupabase().from('posts').insert({ ...input, author_id: await userId() }).select().single();
  if (error) throw error;
  return data;
}
export async function updatePost(id: string, input: Partial<PostInput>) {
  const { data, error } = await getSupabase().from('posts').update(input).eq('id', id).eq('author_id', await userId()).select().single();
  if (error) throw error;
  return data;
}
export async function deletePost(id: string) {
  const { data, error } = await getSupabase().from('posts').delete().eq('id', id).eq('author_id', await userId()).select('id').single();
  if (error) throw error;
  return data;
}
export async function createConversation(otherUserId: string, postId?: string) {
  const { data, error } = await getSupabase().rpc('create_conversation', { other_user_id: otherUserId, ...(postId ? { post_id: postId } : {}) });
  if (error) throw error;
  return data;
}
export async function getConversations(offset = 0, limit = 20) {
  const { data, error } = await getSupabase().from('conversations').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(...page(offset, limit));
  if (error) throw error;
  return data;
}
export async function getParticipants(conversationId: string) {
  const { data, error } = await getSupabase().from('conversation_participants').select('*').eq('conversation_id', conversationId);
  if (error) throw error;
  return data;
}
export async function getMessages(conversationId: string, offset = 0, limit = 50) {
  const { data, error } = await getSupabase().from('messages').select('*').eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false }).order('id', { ascending: false }).range(...page(offset, limit));
  if (error) throw error;
  return data; // Newest first; reverse for chronological display.
}
export async function sendMessage(conversationId: string, content: string) {
  const { data, error } = await getSupabase().from('messages').insert({ conversation_id: conversationId, sender_id: await userId(), content }).select().single();
  if (error) throw error;
  return data;
}

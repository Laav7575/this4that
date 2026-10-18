import { DEMO, DEMO_USER_ID } from '../lib/demo';
import { getSupabase } from '../lib/supabase';
import * as demo from './demoBackend';
import { getProfile } from './backend';
import type { PostRow, ProfileRow } from '../types/database';

export type ProfileWithMeta = ProfileRow & { created_at?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string | undefined): value is string =>
  !!value && UUID.test(value);

export async function getMyUserId(): Promise<string | null> {
  if (DEMO) return DEMO_USER_ID;
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function getMyAuthInfo() {
  if (DEMO) {
    const profile = await demo.getProfile(DEMO_USER_ID);
    return {
      id: DEMO_USER_ID,
      createdAt: profile?.created_at,
      name: profile?.name,
    };
  }
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return {
    id: data.user?.id ?? null,
    createdAt: data.user?.created_at,
    name: data.user?.user_metadata?.name as string | undefined,
  };
}

export async function getPostsByAuthor(
  authorId: string,
  limit = 20,
): Promise<PostRow[]> {
  if (DEMO) return demo.getPostsByAuthor(authorId, limit);
  const { data, error } = await getSupabase()
    .from('posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function loadProfileBundle(id: string) {
  const [profile, posts] = await Promise.all([
    getProfile(id),
    getPostsByAuthor(id),
  ]);
  return { profile: profile as ProfileWithMeta | null, posts };
}
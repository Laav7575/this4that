import { getSupabase } from '../lib/supabase';
/** Client-side convenience only. Migration independently checks confirmed Auth email on all data access. */
export async function signUp(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@uwaterloo\.ca$/.test(normalized)) throw new Error('Use your @uwaterloo.ca email.');
  const { data, error } = await getSupabase().auth.signUp({ email: normalized, password });
  if (error) throw error;
  return data; // With confirmation enabled, session is null until email is confirmed and user signs in.
}
export async function signIn(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

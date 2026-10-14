import { getSupabase } from '../lib/supabase';
/** Client-side convenience only. Migration independently checks confirmed Auth email on all data access. */
export async function signUp(email: string, password: string, name?: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@uwaterloo\.ca$/.test(normalized)) throw new Error('Use your @uwaterloo.ca email.');
  const { data, error } = await getSupabase().auth.signUp({
    email: normalized,
    password,
    // The name is kept with the account so the profile can be created after the first confirmed sign-in.
    options: name ? { data: { name } } : undefined,
  });
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

/** Sends the reset email. Supabase answers the same way whether or not the account exists. */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@uwaterloo\.ca$/.test(normalized)) throw new Error('Use your @uwaterloo.ca email.');
  const { error } = await getSupabase().auth.resetPasswordForEmail(normalized, { redirectTo });
  if (error) throw error;
}
/** Turns the tokens from the emailed link into a temporary signed-in session. */
export async function startRecoverySession(accessToken: string, refreshToken: string) {
  const { error } = await getSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
}
export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw error;
}

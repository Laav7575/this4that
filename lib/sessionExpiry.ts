import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export const SESSION_MAX_AGE_DAYS = 7;
const MAX_AGE_MS = SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const KEY = 'session_started_at';

export async function markSessionStart() {
  await AsyncStorage.setItem(KEY, new Date().toISOString());
}
export async function clearSessionStart() {
  await AsyncStorage.removeItem(KEY);
}

async function isSessionTooOld(session: Session) {
  let startedAt = Date.parse((await AsyncStorage.getItem(KEY)) ?? '');
  // Sessions created before this change have no stamp: fall back to Supabase's own sign-in time.
  if (Number.isNaN(startedAt)) startedAt = Date.parse(session.user.last_sign_in_at ?? '');
  if (Number.isNaN(startedAt)) { await markSessionStart(); return false; }
  return Date.now() - startedAt > MAX_AGE_MS;
}

/** Signs out (this device only) if the session is older than the limit. Returns true if it did. */
export async function expireSessionIfTooOld(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (!data.session || !(await isSessionTooOld(data.session))) return false;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return false; // e.g. offline: leave them in and retry next time
    await clearSessionStart();
    return true;
  } catch {
    return false;
  }
}
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { AppState, Platform } from 'react-native';

let client: SupabaseClient<Database> | undefined;

/** Lazy initialization keeps the mock foundation runnable without a project. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env, then restart Expo.');
  }
  if (!key.startsWith('sb_publishable_')) {
    throw new Error('Use a Supabase publishable key (sb_publishable_...), never a secret or service-role key.');
  }
  client = createClient<Database>(url, key, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Call once from the root layout; returns cleanup for React effects/Fast Refresh. */
export function manageSupabaseSessionRefresh(): () => void {
  if (Platform.OS === 'web') return () => {};
  const supabase = getSupabase();
  const refresh = (state: string) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  refresh(AppState.currentState);
  const subscription = AppState.addEventListener('change', refresh);
  return () => { subscription.remove(); supabase.auth.stopAutoRefresh(); };
}

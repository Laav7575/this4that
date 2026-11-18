import { getSupabase } from '../lib/supabase';
import { createMyProfile, getProfile } from './backend';

export const TERMS_VERSION = 'v1';

export async function checkTermsAcceptance(userId: string, savedName: string, email?: string) {
  if (!(await getProfile(userId))) {
    try {
      await createMyProfile({ name: savedName || email?.split('@')[0] || 'Waterloo student' });
    } catch (error) {
      // Another session may have created the profile after our read.
      if (!(await getProfile(userId))) throw error;
    }
  }

  const { data, error } = await getSupabase()
    .from('terms_acceptances')
    .select('terms_version')
    .eq('user_id', userId)
    .eq('terms_version', TERMS_VERSION)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function acceptTerms(userId: string) {
  const { error } = await getSupabase()
    .from('terms_acceptances')
    .upsert({ user_id: userId, terms_version: TERMS_VERSION }, {
      onConflict: 'user_id,terms_version',
      ignoreDuplicates: true,
    });
  if (error) throw error;
}

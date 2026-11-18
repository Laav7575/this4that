import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import type { Session } from '@supabase/supabase-js';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { signOut } from '../services/auth';
import { acceptTerms, checkTermsAcceptance } from '../services/terms';
import { TermsAcceptanceContext } from '../lib/terms';
import { theme } from '../constants/theme';
import { DEMO } from '../lib/demo';
import { getSupabase, manageSupabaseSessionRefresh } from '../lib/supabase';
import { ActivityIndicator, AppState, Text, View } from 'react-native';
import { expireSessionIfTooOld } from '../lib/sessionExpiry';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // undefined = still checking, null = signed out, otherwise the signed-in session.
  const [session, setSession] = useState<Session | null | undefined>(DEMO ? null : undefined);
  const segments = useSegments();
  const firstSegment = (segments as string[])[0];

  // Demo mode (lib/demo.ts) treats you as signed in without touching Supabase.
  const userId = session?.user.id;
  const email = session?.user.email;
  const name = session?.user.user_metadata?.name;
  const savedName = typeof name === 'string' ? name.trim() : '';
  const recovering = firstSegment === 'reset-password';
  const [onboarding, setOnboarding] = useState<{
    userId: string;
    status: 'pending' | 'accepted' | 'error';
  }>();
  const [retry, setRetry] = useState(0);
  const [signOutError, setSignOutError] = useState(false);
  const status = onboarding?.userId === userId ? onboarding?.status : undefined;
  const canEnter = DEMO || status === 'accepted';
  const needsTerms = !DEMO && status === 'pending';

  useEffect(() => {
    let stopRefresh = () => {};
    if (DEMO) return stopRefresh;
    try {
      const supabase = getSupabase();
      stopRefresh = manageSupabaseSessionRefresh();
      // Drop an over-age session before anything signed-in is shown.
      expireSessionIfTooOld()
        .then(() => supabase.auth.getSession())
        .then(({ data }) => setSession(data.session));
      const { data } = supabase.auth.onAuthStateChange((event, next) => {
        if (event === 'INITIAL_SESSION') return; // handled by getSession above
        if (!next) setOnboarding(undefined);
        setSession(next);
      });
      // Also check when the app returns to the foreground, since it can stay in memory for days.
      const appState = AppState.addEventListener('change', (s) => {
        if (s === 'active') void expireSessionIfTooOld();
      });
      return () => { data.subscription.unsubscribe(); appState.remove(); stopRefresh(); };
    } catch {
      // Resolve session initialization as signed out when Supabase is unconfigured.
      void Promise.resolve().then(() => setSession(null));
    }
    return stopRefresh;
  }, []);

  useEffect(() => {
    if (!userId || recovering) return;
    let active = true;
    checkTermsAcceptance(userId, savedName, email).then(
      accepted => { if (active) setOnboarding({ userId, status: accepted ? 'accepted' : 'pending' }); },
      () => { if (active) setOnboarding({ userId, status: 'error' }); },
    );
    return () => { active = false; };
  }, [userId, savedName, email, recovering, retry]);

  useEffect(() => {
    if (!loaded || error) return;
    if (firstSegment === undefined || firstSegment === 'login' || firstSegment === 'terms') {
      if (canEnter) router.replace('/home');
      else if (needsTerms && firstSegment !== 'terms') router.replace('/terms');
    }
  }, [canEnter, needsTerms, firstSegment, loaded, error]);

  async function saveAcceptance() {
    if (!userId) throw new Error('Sign in to accept the terms.');
    await acceptTerms(userId);
    setOnboarding({ userId, status: 'accepted' });
  }

  if ((!loaded && !error) || session === undefined || (userId && !recovering && status === undefined)) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading" /></View>;
  if (error) return <Text>Unable to load bundled fonts. Restart the application.</Text>;
  if (userId && !recovering && status === 'error') {
    return <View style={{ flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <Text accessibilityRole="alert">Could not finish setting up your account.</Text>
      {signOutError && <Text accessibilityRole="alert">Could not sign out. Try again.</Text>}
      <Button label="Try again" onPress={() => {
        setSignOutError(false);
        setOnboarding(undefined);
        setRetry(value => value + 1);
      }} />
      <Button label="Sign out" variant="secondary" onPress={() => {
        setSignOutError(false);
        signOut().catch(() => setSignOutError(true));
      }} />
    </View>;
  }
  return <TermsAcceptanceContext.Provider value={saveAcceptance}><SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{
    headerTintColor: theme.colors.text, headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontFamily: theme.typography.regular, fontSize: 15 }, contentStyle: { backgroundColor: theme.colors.background },
  }}>
    {/* Open to everyone */}
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ headerShown: false }} />
    <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />

    <Stack.Protected guard={needsTerms}>
      <Stack.Screen name="terms" options={{ title: 'Terms and Conditions', headerBackVisible: false }} />
    </Stack.Protected>

    <Stack.Protected guard={canEnter}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ title: 'Post Details', headerBackTitle: 'Home' }} />
      <Stack.Screen name="post/new" options={{ title: 'New Post', headerBackTitle: 'Back' }} />
      <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerBackTitle: 'Messages' }} />
      <Stack.Screen name="user/[id]" options={{ title: 'Public Profile', headerBackTitle: 'Back' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile', headerBackTitle: 'Back' }} />
    </Stack.Protected>
  </Stack></SafeAreaProvider></TermsAcceptanceContext.Provider>;
}

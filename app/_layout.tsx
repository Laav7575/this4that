import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { getSupabase, manageSupabaseSessionRefresh } from '../lib/supabase';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // undefined = still checking, null = signed out, otherwise the signed-in session.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const segments = useSegments();
  const firstSegment = (segments as string[])[0];

  useEffect(() => {
    let stopRefresh = () => {};
    try {
      const supabase = getSupabase();
      stopRefresh = manageSupabaseSessionRefresh();
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
      return () => { data.subscription.unsubscribe(); stopRefresh(); };
    } catch {
      setSession(null); // Supabase is not configured: behave as signed out
    }
    return stopRefresh;
  }, []);

  // Signed in but sitting on the start or login screen: go to Home.
  // (Not on reset-password, which also has a temporary session.)
  useEffect(() => {
    if (session && (firstSegment === undefined || firstSegment === 'login')) router.replace('/home');
  }, [session, firstSegment]);

  if ((!loaded && !error) || session === undefined) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading" /></View>;
  if (error) return <Text>Unable to load bundled fonts. Restart the application.</Text>;
  return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{
    headerTintColor: theme.colors.text, headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontFamily: theme.typography.regular, fontSize: 15 }, contentStyle: { backgroundColor: theme.colors.background },
  }}>
    {/* Open to everyone */}
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ headerShown: false }} />
    <Stack.Screen name="reset-password" options={{ headerShown: false }} />
    <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />

    {/* Signed-in users only: anyone else is sent back to the start, which leads to login */}
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ title: 'Post Details' }} />
      <Stack.Screen name="post/new" options={{ title: 'New Post' }} />
      <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
      <Stack.Screen name="user/[id]" options={{ title: 'Public Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
    </Stack.Protected>
  </Stack></SafeAreaProvider>;
}

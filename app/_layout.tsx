import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!loaded && !error) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading fonts" /></View>;
  if (error) return <Text>Unable to load bundled fonts. Restart the application.</Text>;
  return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{
    headerTintColor: theme.colors.text, headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontFamily: theme.typography.regular, fontSize: 15 }, contentStyle: { backgroundColor: theme.colors.background },
  }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ title: 'Login' }} />
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="post/[id]" options={{ title: 'Post Details' }} />
    <Stack.Screen name="post/new" options={{ title: 'New Post' }} />
    <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
    <Stack.Screen name="user/[id]" options={{ title: 'Public Profile' }} />
    <Stack.Screen name="+not-found" options={{ title: 'Page not found' }} />
  </Stack></SafeAreaProvider>;
}

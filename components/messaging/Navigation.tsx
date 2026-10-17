import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
const headerIcons = {
  settings: require('../../assets/icons/messaging/settings.svg'), add: require('../../assets/icons/messaging/add.svg'),
  back: require('../../assets/icons/messaging/back.svg'), more: require('../../assets/icons/messaging/more.svg'),
};
export function HeaderIcon({ icon, label, onPress }: { icon: keyof typeof headerIcons; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}>
    <Image source={headerIcons[icon]} contentFit="contain" style={{ width: icon === 'more' ? 20 : 24, height: icon === 'more' ? 20 : 24 }} />
  </Pressable>;
}
const tabs = [
  { path: '/home', label: 'Home', icon: require('../../assets/icons/home.svg') },
  { path: '/search', label: 'Search', icon: require('../../assets/icons/search.svg') },
  { path: '/messages', label: 'Messages', icon: require('../../assets/icons/messages.svg') },
  { path: '/profile', label: 'My Profile', icon: require('../../assets/icons/profile.svg') },
] as const;
/** Keep the app's four-tab convention available on the stack-based chat route. */
export function ChatNavigation() {
  return <View style={styles.tabs}>{tabs.map(tab => <Pressable key={tab.path} accessibilityRole="button"
    accessibilityLabel={tab.label} accessibilityState={{ selected: tab.path === '/messages' }}
    onPress={() => router.dismissTo(tab.path)} style={styles.tab}>
    <Image source={tab.icon} contentFit="contain" style={[styles.icon, tab.path === '/messages' && { tintColor: theme.colors.secondary }]} />
    <Text style={[styles.label, tab.path === '/messages' && { color: theme.colors.secondary }]}>{tab.label}</Text>
  </Pressable>)}</View>;
}
const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  tabs: { flexDirection: 'row', minHeight: 64, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 24, height: 24, tintColor: theme.colors.text }, label: { ...theme.typography.caption, color: theme.colors.text },
});

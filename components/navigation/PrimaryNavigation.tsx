import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { TabArtwork } from './TabArtwork';
import { theme } from '../../constants/theme';

export const primaryTabs = [
  { name: 'home', path: '/home', label: 'Home', icon: require('../../assets/icons/home.svg') },
  { name: 'messages', path: '/messages', label: 'Messages', icon: require('../../assets/icons/messages.svg') },
  { name: 'profile', path: '/profile', label: 'My Profile', icon: require('../../assets/icons/profile.svg') },
] as const;
export const navigationStyle = {
  active: '#FF6B35', // SCRUM-31: orange selected navigation treatment.
  inactive: '#000000',
  iconSize: 24,
  barHeight: theme.dimensions.tabBar,
} as const;
export function TabIcon({ name, color }: { name: typeof primaryTabs[number]['name']; color: string }) {
  return <TabArtwork name={name} color={color} />;
}
/** One shared header action so every primary screen uses the same hit area and placement. */
export function AddPostButton() {
  return <Pressable accessibilityRole="button" accessibilityLabel="Add post" onPress={() => router.push('/post/new')}
    style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
    <Image source={require('../../assets/icons/messaging/add.svg')} contentFit="contain" style={styles.addIcon} />
  </Pressable>;
}
const styles = StyleSheet.create({
  add: { width: theme.dimensions.touchTarget, height: theme.dimensions.touchTarget, marginRight: theme.spacing.sm,
    alignItems: 'center', justifyContent: 'center' },
  addIcon: { width: navigationStyle.iconSize, height: navigationStyle.iconSize, tintColor: navigationStyle.inactive },
  pressed: { opacity: 0.5 },
});

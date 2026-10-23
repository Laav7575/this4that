import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { navigationStyle, primaryTabs, TabIcon } from '../navigation/PrimaryNavigation';
import { theme } from '../../constants/theme';
const headerIcons = {
  settings: require('../../assets/icons/messaging/settings.svg'), add: require('../../assets/icons/messaging/add.svg'),
  back: require('../../assets/icons/messaging/back.svg'), more: require('../../assets/icons/messaging/more.svg'),
};
/** 44×44 touch target with a 24px icon, so every message control lines up the same way. */
export function HeaderIcon({ icon, label, onPress, style }: { icon: keyof typeof headerIcons; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.button, style, pressed && { opacity: 0.5 }]}>
    <Image source={headerIcons[icon]} contentFit="contain" style={styles.headerIcon} />
  </Pressable>;
}
/** Keep the app's primary navigation available on the stack-based chat route. */
export function ChatNavigation() {
  return <View style={styles.tabs}>{primaryTabs.map(tab => <Pressable key={tab.path} accessibilityRole="button"
    accessibilityLabel={tab.label} accessibilityState={{ selected: tab.path === '/messages' }}
    onPress={() => router.dismissTo(tab.path)} style={styles.tab}>
    <TabIcon name={tab.name} color={tab.name === 'messages' ? navigationStyle.active : navigationStyle.inactive} />
    <Text style={[styles.label, tab.path === '/messages' && { color: navigationStyle.active }]}>{tab.label}</Text>
  </Pressable>)}</View>;
}
const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  headerIcon: { width: 24, height: 24 },
  tabs: { flexDirection: 'row', minHeight: navigationStyle.barHeight, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { ...theme.typography.caption, color: navigationStyle.inactive },
});

import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '../../constants/theme';
type Props = ViewProps & { onPress?: () => void; accessibilityLabel?: string };
export function Card({ onPress, style, ...props }: Props) {
  return onPress ? <Pressable {...props} onPress={onPress} accessibilityRole="button"
    style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }, style]} /> : <View {...props} style={[styles.card, style]} />;
}
const styles = StyleSheet.create({ card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border,
  borderWidth: 1, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md } });

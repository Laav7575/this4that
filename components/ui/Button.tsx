import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { theme } from '../../constants/theme';
type Props = Omit<PressableProps, 'children'> & { label: string; variant?: 'primary' | 'secondary'; loading?: boolean };
export function Button({ label, variant = 'primary', loading = false, disabled, style, ...props }: Props) {
  const inactive = disabled || loading;
  const color = variant === 'primary' ? theme.colors.surface : theme.colors.primary;
  return <Pressable {...props} accessibilityRole="button" accessibilityState={{ disabled: !!inactive, busy: loading }}
    disabled={inactive} style={state => [styles.base, variant === 'primary' ? styles.primary : styles.secondary,
      (inactive || state.pressed) && styles.dimmed, typeof style === 'function' ? style(state) : style]}>
    {loading && <ActivityIndicator color={color} size="small" />}
    <Text style={[theme.typography.button, { color }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  base: { minHeight: theme.dimensions.touchTarget, borderRadius: theme.radius.button, paddingHorizontal: theme.spacing.xl,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  primary: { backgroundColor: theme.colors.primary }, secondary: { borderWidth: 1, borderColor: theme.colors.primary },
  dimmed: { opacity: 0.5 },
});

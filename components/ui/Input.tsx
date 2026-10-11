import { useId, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../../constants/theme';
type Props = TextInputProps & { label?: string; error?: string };
export function Input({ label, error, style, onFocus, onBlur, accessibilityLabel, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  return <View style={styles.group}>
    {label && <Text nativeID={id} style={styles.label}>{label}</Text>}
    <TextInput {...props} accessibilityLabel={accessibilityLabel ?? label} accessibilityLabelledBy={label ? id : undefined}
      placeholderTextColor={theme.colors.muted} onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }} style={[styles.field,
        focused && { borderColor: theme.colors.primary }, error && { borderColor: theme.colors.error }, style]} />
    {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 6 }, label: { ...theme.typography.label, color: theme.colors.body },
  field: { ...theme.typography.body, fontFamily: theme.typography.medium, color: theme.colors.text,
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.md, minHeight: theme.dimensions.input, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  error: { ...theme.typography.caption, color: theme.colors.error },
});

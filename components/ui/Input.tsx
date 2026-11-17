import { useId, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '../../constants/theme';
import Svg, { Circle, Path } from 'react-native-svg';
type Props = TextInputProps & { label?: string; error?: string };
export function Input({ label, error, style, onFocus, onBlur, accessibilityLabel, secureTextEntry, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const id = useId();
  const isPassword = !!secureTextEntry;
  return <View style={styles.group}>
    {label && <Text nativeID={id} style={styles.label}>{label}</Text>}
    <View>
      <TextInput {...props} secureTextEntry={isPassword && !revealed}
        accessibilityLabel={accessibilityLabel ?? label} accessibilityLabelledBy={label ? id : undefined}
        placeholderTextColor={theme.colors.muted} onFocus={e => { setFocused(true); onFocus?.(e); }}
        onBlur={e => { setFocused(false); onBlur?.(e); }} style={[styles.field, isPassword && styles.passwordField,
          focused && { borderColor: theme.colors.primary }, error && { borderColor: theme.colors.error }, style]} />
      {isPassword && <Pressable accessibilityRole="button" accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
        onPress={() => setRevealed(r => !r)} hitSlop={8} style={styles.reveal}>
        <EyeIcon off={!revealed} />
      </Pressable>}
    </View>
    {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}
function EyeIcon({ off, size = 22 }: { off: boolean; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={theme.colors.body}
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
    <Circle cx="12" cy="12" r="3" />
    {off && <Path d="M4 4l16 16" />}
  </Svg>;
}
const styles = StyleSheet.create({
  group: { gap: 6 }, label: { ...theme.typography.label, color: theme.colors.body },
  field: { ...theme.typography.body, fontFamily: theme.typography.medium, color: theme.colors.text,
    backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1,
    borderRadius: theme.radius.md, minHeight: theme.dimensions.input, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  passwordField: { paddingRight: 68 }, // leave room for the Show/Hide button
  reveal: { position: 'absolute', right: theme.spacing.lg, top: 0, bottom: 0, justifyContent: 'center' },
  revealText: { ...theme.typography.label, color: theme.colors.text },
  error: { ...theme.typography.caption, color: theme.colors.error },
});
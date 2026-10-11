import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
export function Avatar({ name, uri, size = theme.dimensions.avatar }: { name: string; uri?: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string>();
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  return <View accessible accessibilityLabel={`${name || 'User'} avatar`} style={[styles.base, { width: size, height: size }]}>
    {uri && failedUri !== uri ? <Image source={{ uri }} onError={() => setFailedUri(uri)} style={{ width: size, height: size }} /> :
      <Text style={[styles.initials, { fontSize: size >= 56 ? 20 : 14 }]}>{initials}</Text>}
  </View>;
}
const styles = StyleSheet.create({ base: { backgroundColor: theme.colors.highlight, borderRadius: theme.radius.full,
  alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: theme.typography.semibold, color: theme.colors.text } });

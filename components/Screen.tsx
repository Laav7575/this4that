import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
export function Screen({ children }: PropsWithChildren) {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.fill}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, padding: theme.spacing.lg }, content: { width: '100%', maxWidth: theme.dimensions.contentMaxWidth,
    alignSelf: 'center', gap: theme.spacing.lg } });

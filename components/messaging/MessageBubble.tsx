import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { messageTime } from '../../services/messaging';
import type { MessageRow } from '../../types/database';

/** Figma Foundation 13:1901: asymmetric corners, outgoing messages on the right. */
export function MessageBubble({ message, sent }: { message: MessageRow; sent: boolean }) {
  return <View style={[styles.bubble, sent ? styles.sent : styles.received]}>
    <Text selectable style={[styles.content, sent && styles.inverse]}>{message.content}</Text>
    <Text style={[styles.time, sent && styles.sentTime]}>{messageTime(message.timestamp)}</Text>
  </View>;
}
const styles = StyleSheet.create({
  bubble: { maxWidth: '84%', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, borderRadius: 16, gap: theme.spacing.xs },
  sent: { alignSelf: 'flex-end', backgroundColor: theme.colors.text, borderBottomRightRadius: 4 },
  received: { alignSelf: 'flex-start', backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderBottomLeftRadius: 4 },
  content: { ...theme.typography.body, fontFamily: theme.typography.medium, color: theme.colors.body },
  inverse: { color: theme.colors.surface }, time: { ...theme.typography.caption, color: theme.colors.muted },
  sentTime: { color: theme.colors.surface, opacity: 0.7 },
});

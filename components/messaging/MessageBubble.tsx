import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { messageTime } from '../../services/messaging';
import type { MessageRow } from '../../types/database';

/** Figma Foundation 13:1901: asymmetric corners, outgoing messages on the right. */
export function MessageBubble({ message, sent, onOpenPost }: { message: MessageRow; sent: boolean; onOpenPost?: (postId: string) => void }) {
  // Exchange notice: the chat moved on to another post. Centered like a day divider, not a bubble.
  if (message.post_id) { const postId = message.post_id; return <Pressable accessibilityRole="button"
    accessibilityLabel={`${message.content.replace('\n', '. ')}. View exchange`} disabled={!onOpenPost} onPress={() => onOpenPost?.(postId)}
    style={({ pressed }) => [styles.notice, pressed && { opacity: 0.6 }]}>
    <Text style={styles.noticeLabel}>EXCHANGE UPDATED · {messageTime(message.timestamp)}</Text>
    {message.content.split('\n').map((line, i) => <Text key={i} style={i ? styles.noticePrevious : styles.noticeText}>{line}</Text>)}
    <Text style={styles.noticeLink}>View exchange</Text>
  </Pressable>; }
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
  notice: { alignSelf: 'center', alignItems: 'center', maxWidth: '90%', gap: 2, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  noticeLabel: { fontFamily: theme.typography.semibold, fontSize: 10, lineHeight: 14, color: theme.colors.muted },
  noticeText: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text, textAlign: 'center' },
  noticePrevious: { ...theme.typography.caption, color: theme.colors.muted, textAlign: 'center' },
  noticeLink: { ...theme.typography.caption, color: theme.colors.muted, textDecorationLine: 'underline' },
});

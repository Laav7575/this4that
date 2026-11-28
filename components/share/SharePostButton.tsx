import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import Svg, { Path } from 'react-native-svg';
import { Avatar, Button } from '../ui';
import { webGuard } from '../ui/webGuard';
import { theme } from '../../constants/theme';
import { copyPostLink, loadShareTargets, sendPostToConversation, type ShareTarget } from '../../services/share';

type Post = { id: string; title: string };
type Targets = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; items: ShareTarget[] };
type SendState = 'sending' | 'sent' | 'error';

function ShareSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const posthog = usePostHog();
  const [targets, setTargets] = useState<Targets>({ status: 'loading' });
  const [sends, setSends] = useState<Record<string, SendState>>({});
  const [copied, setCopied] = useState<'idle' | 'done' | 'error'>('idle');

  useEffect(() => {
    let active = true;
    loadShareTargets()
      .then(items => { if (active) setTargets({ status: 'ready', items }); })
      .catch(() => { if (active) setTargets({ status: 'error', message: 'Could not load your conversations.' }); });
    return () => { active = false; };
  }, []);

  const copy = async () => {
    try {
      await copyPostLink(post.id);
      posthog.capture('post_shared', { method: 'copy_link' });
      setCopied('done');
    } catch { setCopied('error'); }
  };

  const send = async (conversationId: string) => {
    setSends(current => ({ ...current, [conversationId]: 'sending' }));
    try {
      await sendPostToConversation(conversationId, post);
      posthog.capture('post_shared', { method: 'message' });
      setSends(current => ({ ...current, [conversationId]: 'sent' }));
    } catch { setSends(current => ({ ...current, [conversationId]: 'error' })); }
  };

  return (
    <View style={styles.backdrop} {...webGuard}>
      <View style={styles.card} accessibilityViewIsModal {...webGuard}>
        <Text accessibilityRole="header" style={styles.title}>Share post</Text>
        <Button label={copied === 'done' ? 'Link copied ✓' : 'Copy link'} variant="secondary" onPress={copy} />
        {copied === 'error' && <Text accessibilityRole="alert" style={styles.error}>Could not copy the link.</Text>}

        <Text style={styles.section}>SEND IN A MESSAGE</Text>
        {targets.status === 'loading' ? <ActivityIndicator accessibilityLabel="Loading conversations" /> : null}
        {targets.status === 'error' ? <Text accessibilityRole="alert" style={styles.error}>{targets.message}</Text> : null}
        {targets.status === 'ready' && targets.items.length === 0 ? (
          <Text style={styles.muted}>No open conversations yet. Message someone from their post or profile first.</Text>
        ) : null}
        {targets.status === 'ready' && targets.items.length > 0 ? (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {targets.items.map(({ conversationId, person }) => {
              const state = sends[conversationId];
              return (
                <View key={conversationId} style={styles.row}>
                  <Avatar name={person?.name ?? 'Student'} uri={person?.avatar ?? undefined} />
                  <Text numberOfLines={1} style={styles.name}>{person?.name ?? 'Student'}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Send to ${person?.name ?? 'student'}`}
                    disabled={state === 'sending' || state === 'sent'}
                    onPress={() => send(conversationId)}
                    style={({ pressed }) => [styles.sendButton, state === 'sent' && styles.sentButton, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.sendText, state === 'sent' && styles.sentText]}>
                      {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : state === 'error' ? 'Retry' : 'Send'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
        <Button label="Done" onPress={onClose} />
      </View>
    </View>
  );
}

export function SharePostButton({ postId, title }: { postId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share post"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke={theme.colors.muted}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      {/* The sheet only exists while open, so it loads fresh and starts clean each time. */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        {open ? <ShareSheet post={{ id: postId, title }} onClose={() => setOpen(false)} /> : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: { marginRight: -11, minWidth: theme.dimensions.touchTarget, minHeight: theme.dimensions.touchTarget, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  card: { width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  title: { ...theme.typography.heading, color: theme.colors.text },
  section: { ...theme.typography.caption, fontFamily: theme.typography.semibold, color: theme.colors.muted, marginTop: theme.spacing.sm },
  muted: { ...theme.typography.body, color: theme.colors.muted },
  error: { ...theme.typography.body, color: theme.colors.error },
  list: { maxHeight: 280 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.dimensions.touchTarget, paddingVertical: theme.spacing.xs },
  name: { flex: 1, ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  sendButton: { minHeight: 36, paddingHorizontal: theme.spacing.lg, borderRadius: theme.radius.full, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sentButton: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  sendText: { fontFamily: theme.typography.semibold, fontSize: 14, lineHeight: 20, color: theme.colors.text },
  sentText: { color: theme.colors.muted },
});

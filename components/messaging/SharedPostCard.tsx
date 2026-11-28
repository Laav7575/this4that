import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { getPost } from '../../services/backend';
import type { PostRow } from '../../types/database';

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; post: Promise<PostRow | null> }>();
function loadPost(id: string) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.post;
  const post = getPost(id);
  cache.set(id, { at: Date.now(), post });
  post.catch(() => cache.delete(id));
  return post;
}

type State = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; post: PostRow };

/** Chat preview of a shared post: same badge and title as the post itself. Tap to open it. */
export function SharedPostCard({ postId, sent, time, onOpen }: { postId: string; sent: boolean; time: string; onOpen: (postId: string) => void }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    loadPost(postId)
      .then(post => { if (active) setState(post ? { status: 'ready', post } : { status: 'missing' }); })
      .catch(() => { if (active) setState({ status: 'missing' }); });
    return () => { active = false; };
  }, [postId]);

  const align = sent ? styles.sent : styles.received;
  if (state.status !== 'ready') {
    return (
      <View style={[styles.card, align, styles.plain]}>
        <Text style={styles.muted}>{state.status === 'loading' ? 'Loading post…' : 'This post is no longer available.'}</Text>
        <Text style={styles.muted}>{time}</Text>
      </View>
    );
  }

  const { post } = state;
  const isOffer = post.type === 'Offer';
  const chipStyle = post.completed_at ? styles.completedChip : isOffer ? styles.offerChip : styles.requestChip;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Shared post: ${post.type === 'Offer' ? 'offering' : 'requesting'} ${post.title}. Open post`}
      onPress={() => onOpen(post.id)}
      style={({ pressed }) => [styles.card, align, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.chip, chipStyle]}>
        <Text style={styles.chipText}>{post.completed_at ? 'Completed' : isOffer ? 'Offering' : 'Requesting'}</Text>
      </View>
      <Text numberOfLines={2} style={styles.title}>{post.title}</Text>
      {post.description ? <Text numberOfLines={2} style={styles.description}>{post.description}</Text> : null}
      <Text numberOfLines={1} style={styles.muted}>{[post.category, post.location].filter(Boolean).join(' · ')}</Text>
      <View style={styles.footer}>
        <Text style={styles.open}>View post</Text>
        <Text style={styles.muted}>{time}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '84%', maxWidth: 360, gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  plain: { gap: theme.spacing.xs },
  sent: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  received: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  chip: { alignSelf: 'flex-start', borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  offerChip: { backgroundColor: theme.colors.primary },
  requestChip: { backgroundColor: theme.colors.secondary },
  completedChip: { backgroundColor: theme.colors.completed },
  chipText: { ...theme.typography.label, color: theme.colors.text },
  title: { ...theme.typography.heading, fontSize: 18, lineHeight: 24, color: theme.colors.text },
  description: { ...theme.typography.body, color: theme.colors.body },
  muted: { ...theme.typography.caption, color: theme.colors.muted },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  open: { ...theme.typography.caption, fontFamily: theme.typography.semibold, color: theme.colors.text, textDecorationLine: 'underline' },
});

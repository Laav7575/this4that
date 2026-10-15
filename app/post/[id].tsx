import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Avatar, Button, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { getPost, getProfile } from '../../services/backend';
import type { PostRow, ProfileRow } from '../../types/database';

type Status = 'loading' | 'ready' | 'missing' | 'error';

export default function PostDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const [loaded, setLoaded] = useState<{
    id: string;
    status: Status;
    post: PostRow | null;
    author: ProfileRow | null;
    error: string;
  }>({ id: '', status: 'loading', post: null, author: null, error: '' });
  const [retry, setRetry] = useState(0);
  const isCurrentPost = loaded.id === postId;
  const status: Status = !postId ? 'missing' : isCurrentPost ? loaded.status : 'loading';
  const post = isCurrentPost ? loaded.post : null;
  const author = isCurrentPost ? loaded.author : null;
  const error = isCurrentPost ? loaded.error : '';

  useEffect(() => {
    let active = true;
    if (!postId) return () => { active = false; };

    const load = async () => {
      try {
        const result = await getPost(postId);
        if (!active) return;
        if (!result) {
          setLoaded({ id: postId, status: 'missing', post: null, author: null, error: '' });
          return;
        }
        const profile = await getProfile(result.author_id);
        if (!active) return;
        setLoaded({ id: postId, status: 'ready', post: result, author: profile, error: '' });
      } catch (cause) {
        if (!active) return;
        setLoaded({
          id: postId,
          status: 'error',
          post: null,
          author: null,
          error: cause instanceof Error ? cause.message : 'Could not load this post.',
        });
      }
    };

    void load();
    return () => { active = false; };
  }, [postId, retry]);

  if (status === 'loading') {
    return <Screen><ActivityIndicator accessibilityLabel="Loading post" /></Screen>;
  }
  if (status === 'missing') {
    return <Screen>
      <Text accessibilityRole="header" style={styles.heading}>Post not found</Text>
      <Text style={styles.body}>This listing may have been removed or is no longer available.</Text>
      <Button label="Browse posts" onPress={() => router.replace('/home')} />
    </Screen>;
  }
  if (status === 'error' || !post) {
    return <Screen>
      <Text accessibilityRole="header" style={styles.heading}>Unable to load post</Text>
      <Text accessibilityRole="alert" style={styles.body}>{error}</Text>
      <Button label="Try again" onPress={() => {
        if (postId) setLoaded({ id: postId, status: 'loading', post: null, author: null, error: '' });
        setRetry(value => value + 1);
      }} />
    </Screen>;
  }

  const isOffer = post.type === 'Offer';
  const authorName = author?.name ?? 'Student';

  return (
    <Screen>
      <Card>
        <View style={styles.topline}>
          <Text style={[styles.badge, isOffer ? styles.offerBadge : styles.requestBadge]}>
            {isOffer ? 'Offering' : 'Requesting'}
          </Text>
          <Text style={styles.created}>Posted {new Date(post.created_at).toLocaleDateString()}</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{post.title}</Text>
        <Text style={styles.body}>{post.description}</Text>
        <View style={styles.tags}>
          <Text style={styles.tag}>{post.category}</Text>
          <Text style={styles.tag}>{post.availability}</Text>
        </View>
        <View style={styles.rule} />
        <Text style={styles.label}>LOCATION</Text>
        <Text style={styles.body}>{post.location}</Text>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Posted by</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${authorName}'s profile`}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: post.author_id } })}
          style={styles.author}
        >
          <Avatar name={authorName} uri={author?.avatar ?? undefined} size={theme.dimensions.avatarLarge} />
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{authorName}</Text>
            {author?.program ? <Text style={styles.body}>{author.program}</Text> : null}
            <Text style={styles.profileLink}>View profile</Text>
          </View>
        </Pressable>
      </View>

      {/* TODO: Add a contact action when the messaging flow is implemented. */}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...theme.typography.heading, color: theme.colors.text },
  title: { ...theme.typography.heading, color: theme.colors.text, fontSize: 24, lineHeight: 30 },
  body: { ...theme.typography.body, color: theme.colors.body },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm },
  badge: { ...theme.typography.label, overflow: 'hidden', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, color: theme.colors.text },
  offerBadge: { backgroundColor: theme.colors.primary },
  requestBadge: { backgroundColor: theme.colors.secondary },
  created: { ...theme.typography.caption, color: theme.colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tag: { ...theme.typography.caption, color: theme.colors.body, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  rule: { height: 1, backgroundColor: theme.colors.border },
  label: { ...theme.typography.caption, color: theme.colors.muted },
  section: { gap: theme.spacing.md },
  sectionTitle: { ...theme.typography.heading, color: theme.colors.text },
  author: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border },
  authorDetails: { flex: 1, gap: theme.spacing.xs },
  authorName: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  profileLink: { ...theme.typography.label, color: theme.colors.success },
});

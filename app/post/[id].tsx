import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { MessageAuthorButton } from '../../components/messaging/MessageAuthorButton';
import { ReportPostButton } from '../../components/reports/ReportPostButton';
import { Avatar, Button, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { deletePost, getPost, getProfile } from '../../services/backend';
import { getMyUserId } from '../../services/profileData';
import type { PostRow, ProfileRow } from '../../types/database';

type Status = 'loading' | 'ready' | 'missing' | 'error';
const DESCRIPTION_PREVIEW_LINES = 4;
const DESCRIPTION_LINE_HEIGHT = theme.typography.body.lineHeight;

function PostDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  return (
    <View style={styles.description}>
      <Text
        style={styles.body}
        numberOfLines={hasMore && !expanded ? DESCRIPTION_PREVIEW_LINES : undefined}
      >
        {description}
      </Text>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={styles.descriptionToggle}
        >
          <Text style={styles.descriptionToggleText}>{expanded ? 'Show less' : 'Show more'}</Text>
        </Pressable>
      ) : null}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden={true}
        pointerEvents="none"
        style={styles.descriptionMeasure}
      >
        <Text
          accessible={false}
          onLayout={event => {
            setHasMore(event.nativeEvent.layout.height > DESCRIPTION_LINE_HEIGHT * DESCRIPTION_PREVIEW_LINES);
          }}
          style={styles.body}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function PostDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Array.isArray(id) ? id[0] : id;
  const [loaded, setLoaded] = useState<{
    id: string;
    status: Status;
    post: PostRow | null;
    author: ProfileRow | null;
    viewerId: string | null;
    error: string;
  }>({ id: '', status: 'loading', post: null, author: null, viewerId: null, error: '' });
  const [retry, setRetry] = useState(0);
  const retryRef = useRef(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const isCurrentPost = loaded.id === postId;
  const status: Status = !postId ? 'missing' : isCurrentPost ? loaded.status : 'loading';
  const post = isCurrentPost ? loaded.post : null;
  const author = isCurrentPost ? loaded.author : null;
  const viewerId = isCurrentPost ? loaded.viewerId : null;
  const error = isCurrentPost ? loaded.error : '';

  useFocusEffect(useCallback(() => {
    let active = true;
    const requestRetry = retry;
    if (!postId) return () => { active = false; };

    const load = async () => {
      try {
        const [result, myId] = await Promise.all([getPost(postId), getMyUserId()]);
        if (!active || requestRetry !== retryRef.current) return;
        if (!result) {
          setLoaded({ id: postId, status: 'missing', post: null, author: null, viewerId: myId, error: '' });
          return;
        }
        const profile = await getProfile(result.author_id);
        if (!active || requestRetry !== retryRef.current) return;
        setLoaded({ id: postId, status: 'ready', post: result, author: profile, viewerId: myId, error: '' });
      } catch (cause) {
        if (!active || requestRetry !== retryRef.current) return;
        setLoaded({
          id: postId,
          status: 'error',
          post: null,
          author: null,
          viewerId: null,
          error: cause instanceof Error ? cause.message : 'Could not load this post.',
        });
      }
    };

    void load();
    return () => { active = false; };
  }, [postId, retry]));

  const removePost = async () => {
    if (!post || deleting) return;
    setDeleting(true);
    setActionError('');
    try {
      await deletePost(post.id);
      router.replace('/home');
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not delete this post. Try again.');
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

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
        if (postId) setLoaded({ id: postId, status: 'loading', post: null, author: null, viewerId: null, error: '' });
        retryRef.current += 1;
        setRetry(retryRef.current);
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
          <View style={styles.createdRow}>
            <Text style={styles.created}>Posted {new Date(post.created_at).toLocaleDateString()}</Text>
            <ReportPostButton
              postId={post.id}
              authorId={post.author_id}
              authorName={authorName}
              currentUserId={viewerId ?? undefined}
            />
          </View>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{post.title}</Text>
        <PostDescription key={post.id} description={post.description} />
        <View style={styles.tags}>
          <Text style={styles.tag}>{post.category}</Text>
          <Text style={styles.tag}>{post.availability}</Text>
        </View>
        <View style={styles.rule} />
        <Text style={styles.label}>LOCATION</Text>
        <Text style={styles.body}>{post.location}</Text>
      </Card>

      {viewerId === post.author_id ? (
        <View style={styles.ownerActions}>
          {!confirmingDelete ? (
            <View style={styles.actionButtons}>
              <Button
                label="Edit post"
                variant="secondary"
                onPress={() => router.push({ pathname: '/post/new', params: { postId: post.id } })}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete post"
                disabled={deleting}
                onPress={() => {
                  setActionError('');
                  setConfirmingDelete(true);
                }}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              >
                <Text style={styles.deleteText}>Delete post</Text>
              </Pressable>
            </View>
          ) : null}
          {confirmingDelete ? (
            <View style={styles.deleteConfirmation}>
              <Text style={styles.body}>Delete this post? This can’t be undone.</Text>
              <View style={styles.actionButtons}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  disabled={deleting}
                  onPress={() => setConfirmingDelete(false)}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={() => void removePost()}
                  style={({ pressed }) => [styles.deleteButton, styles.deleteConfirmed, pressed && styles.pressed]}
                >
                  {deleting ? <ActivityIndicator color={theme.colors.surface} size="small" /> : null}
                  <Text style={styles.deleteConfirmedText}>{deleting ? 'Deleting…' : 'Delete permanently'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {actionError ? <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text> : null}
        </View>
      ) : null}

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

      <MessageAuthorButton key={post.id} authorId={post.author_id} postId={post.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...theme.typography.heading, color: theme.colors.text },
  title: { ...theme.typography.heading, color: theme.colors.text, fontSize: 24, lineHeight: 30 },
  body: { ...theme.typography.body, color: theme.colors.body },
  description: { position: 'relative' },
  descriptionMeasure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  descriptionToggle: { alignSelf: 'flex-start', minHeight: theme.dimensions.touchTarget, justifyContent: 'center' },
  descriptionToggleText: { ...theme.typography.label, color: theme.colors.success },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm },
  badge: { ...theme.typography.label, overflow: 'hidden', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.full, color: theme.colors.text },
  offerBadge: { backgroundColor: theme.colors.primary },
  requestBadge: { backgroundColor: theme.colors.secondary },
  created: { ...theme.typography.caption, color: theme.colors.muted },
  createdRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tag: { ...theme.typography.caption, color: theme.colors.body, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  rule: { height: 1, backgroundColor: theme.colors.border },
  label: { ...theme.typography.caption, color: theme.colors.muted },
  section: { gap: theme.spacing.md },
  sectionTitle: { ...theme.typography.heading, color: theme.colors.text },
  ownerActions: { gap: theme.spacing.md },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  deleteConfirmation: { gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.highlight, borderRadius: theme.radius.md },
  deleteButton: { minHeight: theme.dimensions.touchTarget, borderWidth: 1, borderColor: theme.colors.error, borderRadius: theme.radius.button, paddingHorizontal: theme.spacing.xl, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: theme.spacing.sm },
  deleteText: { ...theme.typography.button, color: theme.colors.error },
  deleteConfirmed: { backgroundColor: theme.colors.error },
  deleteConfirmedText: { ...theme.typography.button, color: theme.colors.surface },
  actionError: { ...theme.typography.body, color: theme.colors.error },
  pressed: { opacity: 0.6 },
  author: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border },
  authorDetails: { flex: 1, gap: theme.spacing.xs },
  authorName: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  profileLink: { ...theme.typography.label, color: theme.colors.success },
});

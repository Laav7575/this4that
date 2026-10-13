import { useLayoutEffect, useMemo, useState } from 'react';
import { router, useNavigation } from 'expo-router';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { posts, users } from '../../data/mockData';
import type { Post } from '../../types';

const profileIcon = require('../../assets/icons/profile.svg');

// The home feed shows favour requests only.
const requests = posts
  .filter(post => post.type === 'Request')
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const categories = ['All', ...Array.from(new Set(requests.map(post => post.category)))];

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function PostCard({ post }: { post: Post }) {
  const author = users.find(user => user.id === post.authorId);
  const name = author?.name ?? 'Unknown user';
  return (
    <Card
      accessibilityLabel={`${name} is requesting: ${post.title}`}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Avatar name={name} />
        <View style={styles.cardWho}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{post.location} · {timeAgo(post.createdAt)}</Text>
        </View>
        <View style={styles.requestChip}>
          <Text style={styles.requestChipText}>Requesting</Text>
        </View>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postBody}>{post.description}</Text>
      <View style={styles.tags}>
        <View style={styles.tag}><Text style={styles.tagText}>{post.category}</Text></View>
        <View style={styles.tag}><Text style={styles.tagText}>{post.availability}</Text></View>
      </View>
    </Card>
  );
}

export default function Home() {
  const navigation = useNavigation();
  const [category, setCategory] = useState('All');
  const visible = useMemo(
    () => (category === 'All' ? requests : requests.filter(post => post.category === category)),
    [category],
  );

  // Header: profile icon on the right (replaces the shared "+" for this screen only).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'This4That',
      headerTitleAlign: 'center',
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My profile"
          onPress={() => router.push('/profile')}
          style={styles.headerButton}
        >
          <Image source={profileIcon} contentFit="contain" style={styles.headerIcon} />
        </Pressable>
      ),
    });
  }, [navigation]);

  return (
    <View style={styles.fill}>
      <FlatList
        data={visible}
        keyExtractor={post => post.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <FlatList
            horizontal
            data={categories}
            keyExtractor={item => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            renderItem={({ item }) => {
              const active = item === category;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategory(item)}
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <Text style={[styles.filterText, { color: active ? theme.colors.surface : theme.colors.text }]}>{item}</Text>
                </Pressable>
              );
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No favour requests in this category yet.</Text>}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New post"
        onPress={() => router.push('/post/new')}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.colors.background },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: theme.dimensions.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: 96, // room for the new post button
  },
  headerButton: {
    minWidth: theme.dimensions.touchTarget,
    minHeight: theme.dimensions.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { width: 24, height: 24, tintColor: theme.colors.text },
  filters: { gap: theme.spacing.sm, paddingBottom: theme.spacing.sm },
  filter: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  filterActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
  filterText: { ...theme.typography.label },
  card: { gap: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  cardWho: { flex: 1 },
  name: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  meta: { ...theme.typography.caption, color: theme.colors.muted },
  requestChip: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  requestChipText: { ...theme.typography.label, color: theme.colors.text },
  postTitle: { ...theme.typography.heading, color: theme.colors.text },
  postBody: { ...theme.typography.body, color: theme.colors.body },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  tagText: { ...theme.typography.caption, color: theme.colors.body },
  empty: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center', paddingVertical: theme.spacing.xxxl },
  fab: {
    position: 'absolute',
    right: theme.spacing.xl,
    bottom: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPlus: { fontSize: 30, lineHeight: 34, color: theme.colors.surface },
});

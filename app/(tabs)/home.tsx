import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import * as Device from 'expo-device';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { getSupabase } from '../../lib/supabase';
import { getPosts, getProfile } from '../../services/backend';
import type { PostRow } from '../../types/database';

const profileIcon = require('../../assets/icons/profile.svg');

type Status = 'loading' | 'ready' | 'signedout' | 'error';

// expo-device reports the kind of device: PHONE, TABLET, DESKTOP, and so on.
const isPhone = Device.deviceType === Device.DeviceType.PHONE;

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const typeOptions = [
  { value: 'All', label: 'All' },
  { value: 'Request', label: 'Requests' },
  { value: 'Offer', label: 'Offers' },
];

function FilterRow({ options, selected, onSelect }: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <FlatList
      horizontal
      data={options}
      keyExtractor={item => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filters}
      renderItem={({ item }) => {
        const active = item.value === selected;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.value)}
            style={[styles.filter, active && styles.filterActive]}
          >
            <Text style={[styles.filterText, { color: active ? theme.colors.surface : theme.colors.text }]}>{item.label}</Text>
          </Pressable>
        );
      }}
    />
  );
}

function PostCard({ post, name }: { post: PostRow; name: string }) {
  const isOffer = post.type === 'Offer';
  return (
    <Card
      accessibilityLabel={`${name} is ${isOffer ? 'offering' : 'requesting'}: ${post.title}`}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Avatar name={name} />
        <View style={styles.cardWho}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>{post.location} · {timeAgo(post.created_at)}</Text>
        </View>
        <View style={[styles.typeChip, isOffer ? styles.offerChip : styles.requestChip]}>
          <Text style={styles.typeChipText}>{isOffer ? 'Offering' : 'Requesting'}</Text>
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
  const columns = isPhone ? 1 : 3; // phones: one post per row; everything else: three
  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // The database only returns data to a signed-in, confirmed @uwaterloo.ca account.
      const { data } = await getSupabase().auth.getSession();
      if (!data.session) {
        setStatus('signedout');
        return;
      }
      const myId = data.session.user.id;
      // Requests and offers, minus anything the signed-in user posted themselves.
      const rows = (await getPosts({ limit: 50 })).filter(row => row.author_id !== myId);
      const authorIds = Array.from(new Set(rows.map(row => row.author_id)));
      const profiles = await Promise.all(authorIds.map(id => getProfile(id)));
      const byId: Record<string, string> = {};
      profiles.forEach(profile => { if (profile) byId[profile.id] = profile.name; });
      setPosts(rows);
      setNames(byId);
      setStatus('ready');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load posts.');
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Reload every time the Home tab comes into focus (for example after creating a post).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const categories = useMemo(
    () => [{ value: 'All', label: 'All categories' }, ...Array.from(new Set(posts.map(post => post.category))).map(value => ({ value, label: value }))],
    [posts],
  );
  const visible = useMemo(
    () => posts.filter(post => (typeFilter === 'All' || post.type === typeFilter) && (category === 'All' || post.category === category)),
    [category, typeFilter, posts],
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
        key={columns} // React Native needs a new key whenever numColumns changes
        numColumns={columns}
        data={visible}
        keyExtractor={post => post.id}
        renderItem={({ item }) => (
          <View style={columns > 1 ? styles.cell3 : styles.cell1}>
            <PostCard post={item} name={names[item.author_id] ?? 'Unknown user'} />
          </View>
        )}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); load(); }}
        contentContainerStyle={[styles.list, columns > 1 && styles.listWide]}
        ListHeaderComponent={
          status !== 'ready' || posts.length === 0 ? null : (
            <View>
              <FilterRow options={typeOptions} selected={typeFilter} onSelect={setTypeFilter} />
              <FilterRow options={categories} selected={category} onSelect={setCategory} />
            </View>
          )
        }
        ListEmptyComponent={
          status === 'loading' ? <ActivityIndicator accessibilityLabel="Loading posts" style={styles.state} />
          : status === 'signedout' ? (
            <View style={styles.state}>
              <Text style={styles.empty}>Sign in with your @uwaterloo.ca account to see posts.</Text>
              <Button label="Go to sign in" onPress={() => router.replace('/login')} />
            </View>
          ) : status === 'error' ? (
            <View style={styles.state}>
              <Text style={styles.empty}>{message}</Text>
              <Button label="Try again" variant="secondary" onPress={() => { setStatus('loading'); load(); }} />
            </View>
          ) : (
            <Text style={styles.empty}>{posts.length === 0 ? 'No posts from other students yet.' : 'No posts match these filters yet.'}</Text>
          )
        }
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
  // Wide screens: three cards per row. Cells carry the horizontal gap, so the list padding is reduced to match.
  listWide: { maxWidth: 1200, paddingHorizontal: theme.spacing.lg - theme.spacing.sm },
  cell1: { flexBasis: '100%', maxWidth: '100%' },
  cell3: { flexBasis: '33.3333%', maxWidth: '33.3333%', paddingHorizontal: theme.spacing.sm },
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
  card: { gap: theme.spacing.sm, flexGrow: 1 }, // flexGrow makes cards in the same row equal height
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  cardWho: { flex: 1 },
  name: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  meta: { ...theme.typography.caption, color: theme.colors.muted },
  typeChip: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  requestChip: { backgroundColor: theme.colors.secondary },
  offerChip: { backgroundColor: theme.colors.primary },
  typeChipText: { ...theme.typography.label, color: theme.colors.text },
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
  state: { gap: theme.spacing.lg, paddingVertical: theme.spacing.xxxl },
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

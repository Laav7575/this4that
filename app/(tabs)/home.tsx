import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import * as Device from 'expo-device';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/ui';
import { PostCard } from '../../components/posts/PostCard';
import { MessageAuthorButton } from '../../components/messaging/MessageAuthorButton';
import { theme } from '../../constants/theme';
import { DEMO, DEMO_USER_ID } from '../../lib/demo';
import { getSupabase } from '../../lib/supabase';
import { getPosts, getProfile } from '../../services/backend';
import type { PostRow } from '../../types/database';

const PAGE_SIZE = 50;

type Status = 'loading' | 'ready' | 'signedout' | 'error';

// expo-device reports the kind of device: PHONE, TABLET, DESKTOP, and so on.
const isPhone = Device.deviceType === Device.DeviceType.PHONE;

const typeOptions = [
  { value: 'All', label: 'All' },
  { value: 'Request', label: 'Requests' },
  { value: 'Offer', label: 'Offers' },
];

function FilterRow({
  options,
  selected,
  onSelect,
}: {
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
            <Text
              style={[
                styles.filterText,
                {
                  color: active
                    ? theme.colors.surface
                    : theme.colors.text,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

export default function Home() {
  const navigation = useNavigation();
  const columns = isPhone ? 1 : 3;

  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [myId, setMyId] = useState<string>();

  // Refs avoid rerendering and restarting the focus effect for every page.
  const nextOffset = useRef(0);
  const loadingRef = useRef(false);

  const load = useCallback(async (reset = true) => {
    // Prevent overlapping requests.
    if (loadingRef.current) return;

    loadingRef.current = true;

    if (reset) {
      nextOffset.current = 0;
      setStatus('loading');
      setHasMore(true);
      setMessage('');
    } else {
      setLoadingMore(true);
    }

    try {
      // The database only returns data to a signed-in,
      // confirmed @uwaterloo.ca account.
      const { data, error } = DEMO
        ? { data: { session: { user: { id: DEMO_USER_ID } } }, error: null }
        : await getSupabase().auth.getSession();

      if (error) throw error;

      if (!data.session) {
        setPosts([]);
        setNames({});
        setHasMore(false);
        setStatus('signedout');
        return;
      }

      const myId = data.session.user.id;
      setMyId(myId);
      const offset = nextOffset.current;

      // Fetch one page of posts from Supabase.
      const rows = await getPosts({
        offset,
        limit: PAGE_SIZE,
      });

      // Advance by all database rows, including our own posts.
      nextOffset.current = offset + rows.length;
      setHasMore(rows.length === PAGE_SIZE);

      // Exclude posts created by the signed-in user.
      const filteredRows = rows.filter(
        row => row.author_id !== myId,
      );

      // Fetch profiles only for authors in this page.
      const authorIds = Array.from(
        new Set(filteredRows.map(row => row.author_id)),
      );

      const profiles = await Promise.all(
        authorIds.map(id => getProfile(id)),
      );

      const byId: Record<string, string> = {};

      profiles.forEach(profile => {
        if (profile) byId[profile.id] = profile.name;
      });

      // Replace the feed on refresh; append on infinite scroll.
      setPosts(current => {
        if (reset) return filteredRows;

        const existingIds = new Set(current.map(post => post.id));

        return [
          ...current,
          ...filteredRows.filter(
            post => !existingIds.has(post.id),
          ),
        ];
      });

      setNames(current => ({ ...current, ...byId }));
      setStatus('ready');
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load posts.',
      );

      if (reset) {
        setStatus('error');
      }
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (
      hasMore &&
      status === 'ready' &&
      !loadingRef.current
    ) {
      void load(false);
    }
  }, [hasMore, status, load]);

  // Reload when Home comes into focus, such as after creating a post.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const categories = useMemo(
    () => [
      { value: 'All', label: 'All categories' },
      ...Array.from(new Set(posts.map(post => post.category))).map(
        value => ({ value, label: value }),
      ),
    ],
    [posts],
  );

  const visible = useMemo(
    () =>
      posts.filter(
        post =>
          (typeFilter === 'All' || post.type === typeFilter) &&
          (category === 'All' || post.category === category),
      ),
    [category, typeFilter, posts],
  );

  // Header: profile icon on the right.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'This4That',
      headerTitleAlign: 'center',
      headerRight: () => null,
    });
  }, [navigation]);

  return (
    <View style={styles.fill}>
      <FlatList
        key={columns}
        numColumns={columns}
        data={visible}
        keyExtractor={post => post.id}
        renderItem={({ item }) => (
          <View style={columns > 1 ? styles.cell3 : styles.cell1}>
            <PostCard
              post={item}
              name={names[item.author_id] ?? 'Unknown user'}
              footer={myId ? (
                <MessageAuthorButton compact authorId={item.author_id} postId={item.id} userId={myId} />
              ) : null}
            />
          </View>
        )}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.list,
          columns > 1 && styles.listWide,
        ]}
        ListHeaderComponent={
          status !== 'ready' || posts.length === 0 ? null : (
            <View>
              <FilterRow
                options={typeOptions}
                selected={typeFilter}
                onSelect={setTypeFilter}
              />
              <FilterRow
                options={categories}
                selected={category}
                onSelect={setCategory}
              />
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              accessibilityLabel="Loading more posts"
              style={styles.footerLoader}
            />
          ) : null
        }
        ListEmptyComponent={
          status === 'loading' ? (
            <ActivityIndicator
              accessibilityLabel="Loading posts"
              style={styles.state}
            />
          ) : status === 'signedout' ? (
            <View style={styles.state}>
              <Text style={styles.empty}>
                Sign in with your @uwaterloo.ca account to see posts.
              </Text>
              <Button
                label="Go to sign in"
                onPress={() => router.replace('/login')}
              />
            </View>
          ) : status === 'error' ? (
            <View style={styles.state}>
              <Text style={styles.empty}>{message}</Text>
              <Button
                label="Try again"
                variant="secondary"
                onPress={() => {
                  void load();
                }}
              />
            </View>
          ) : (
            <Text style={styles.empty}>
              {posts.length === 0
                ? 'No posts from other students yet.'
                : 'No posts match these filters yet.'}
            </Text>
          )
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New post"
        onPress={() => router.push('/post/new')}
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: theme.dimensions.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: 96,
  },
  // Wide screens: three cards per row.
  listWide: {
    maxWidth: 1200,
    paddingHorizontal: theme.spacing.lg - theme.spacing.sm,
  },
  cell1: {
    flexBasis: '100%',
    maxWidth: '100%',
  },
  cell3: {
    flexBasis: '33.3333%',
    maxWidth: '33.3333%',
    paddingHorizontal: theme.spacing.sm,
  },
  filters: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  filter: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  filterActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  filterText: {
    ...theme.typography.label,
  },
  state: {
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xxxl,
  },
  empty: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  footerLoader: {
    paddingVertical: 20,
  },
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
  fabPlus: {
    fontSize: 30,
    lineHeight: 34,
    color: theme.colors.surface,
  },
});

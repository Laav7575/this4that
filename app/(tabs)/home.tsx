
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import * as Device from 'expo-device';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { PostCard } from '../../components/posts/PostCard';
import { MessageAuthorButton } from '../../components/messaging/MessageAuthorButton';
import { theme } from '../../constants/theme';
import { DEMO, DEMO_USER_ID } from '../../lib/demo';
import { getSupabase } from '../../lib/supabase';
import { getPostCategories, getPosts, getProfiles } from '../../services/backend';
import type { PostRow } from '../../types/database';

const profileIcon = require('../../assets/icons/profile.svg');
const messagesIcon = require('../../assets/icons/messages.svg');
const searchIcon = require('../../assets/icons/search.svg');
const PAGE_SIZE = 50;

type Status = 'loading' | 'ready' | 'signedout' | 'error';
const DATE_FILTERS = [
  { value: 'any', label: 'Any time' },
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
] as const;
type DateFilter = typeof DATE_FILTERS[number]['value'];

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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      style={styles.filterScroll}
      contentContainerStyle={styles.filters}
    >
      {options.map(item => {
        const active = item.value === selected;

        return (
          <Pressable
            key={item.value}
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
      })}
    </ScrollView>
  );
}

export default function Home() {
  const navigation = useNavigation();
  const columns = isPhone ? 1 : 3;

  const [category, setCategory] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryOptions, setCategoryOptions] = useState([{ value: 'All', label: 'All categories' }]);
  const [categoryError, setCategoryError] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [location, setLocation] = useState('');
  const [debouncedLocation, setDebouncedLocation] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [dateOptionsOpen, setDateOptionsOpen] = useState(false);
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
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLocation(location), 300);
    return () => clearTimeout(timer);
  }, [location]);

  const load = useCallback(async (reset = true) => {
    if (!reset && loadingRef.current) return;
    const currentRequest = reset ? ++requestId.current : requestId.current;
    loadingRef.current = true;

    if (reset) {
      nextOffset.current = 0;
      setStatus('loading');
      setHasMore(true);
      setMessage('');
      setPosts([]);
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
      if (currentRequest !== requestId.current) return;

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
      const ageMilliseconds = dateFilter === 'day' ? 24 * 60 * 60 * 1000
        : dateFilter === 'week' ? 7 * 24 * 60 * 60 * 1000
          : dateFilter === 'month' ? 30 * 24 * 60 * 60 * 1000 : 0;

      // Fetch one page of posts from Supabase.
      const rows = await getPosts({
        offset,
        limit: PAGE_SIZE,
        category: category === 'All' ? undefined : category,
        type: typeFilter === 'All' ? undefined : typeFilter as PostRow['type'],
        search: debouncedQuery.trim() || undefined,
        location: debouncedLocation.trim() || undefined,
        createdAfter: ageMilliseconds ? new Date(Date.now() - ageMilliseconds).toISOString() : undefined,
      });
      if (currentRequest !== requestId.current) return;

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

      const profiles = await getProfiles(authorIds);
      if (currentRequest !== requestId.current) return;

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
      if (currentRequest !== requestId.current) return;
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load posts.',
      );

      if (reset) {
        setStatus('error');
      }
    } finally {
      if (currentRequest === requestId.current) {
        loadingRef.current = false;
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [category, dateFilter, debouncedLocation, debouncedQuery, typeFilter]);

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPostCategories()
        .then(values => {
          if (active) {
            setCategoryOptions([
              { value: 'All', label: 'All categories' },
              ...values.map(value => ({ value, label: value })),
            ]);
            setCategoryError('');
          }
        })
        .catch(error => {
          if (active) setCategoryError(error instanceof Error ? error.message : 'Could not load post categories.');
        });
      return () => { active = false; };
    }, []),
  );

  // Keep search, messages, and profile actions together in the Home header.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'This4That',
      headerTitleAlign: 'center',
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searchExpanded ? 'Close search' : 'Search posts'}
            accessibilityState={{ expanded: searchExpanded }}
            onPress={() => {
              if (searchExpanded) {
                setQuery('');
                setLocation('');
                setDateFilter('any');
                setDateOptionsOpen(false);
              }
              setSearchExpanded(open => !open);
            }}
            style={styles.headerButton}
          >
            <Image
              source={searchIcon}
              contentFit="contain"
              style={styles.headerIcon}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Messages"
            onPress={() => router.push('/messages')}
            style={styles.headerButton}
          >
            <Image
              source={messagesIcon}
              contentFit="contain"
              style={styles.headerIcon}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My profile"
            onPress={() => router.push('/profile')}
            style={styles.headerButton}
          >
            <Image
              source={profileIcon}
              contentFit="contain"
              style={styles.headerIcon}
            />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, searchExpanded]);

  return (
    <View style={styles.fill}>
      <FlatList
        key={columns}
        numColumns={columns}
        nestedScrollEnabled
        data={posts}
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
          <View style={styles.listHeader}>
            <Text style={styles.filterHeading}>FILTERS</Text>
            <FilterRow
              options={typeOptions}
              selected={typeFilter}
              onSelect={value => setTypeFilter(value as typeof typeFilter)}
            />
            <FilterRow
              options={categoryOptions}
              selected={category}
              onSelect={setCategory}
            />
            {categoryError ? <Text style={styles.filterError}>{categoryError}</Text> : null}
            {searchExpanded ? (
              <View style={styles.searchPanel}>
                <Input
                  placeholder="Search keywords"
                  accessibilityLabel="Search keywords"
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
                <Input
                  label="Location"
                  placeholder="Any location"
                  accessibilityLabel="Filter by location"
                  value={location}
                  onChangeText={setLocation}
                  returnKeyType="search"
                />
                <View style={styles.dateGroup}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Date filter: ${DATE_FILTERS.find(filter => filter.value === dateFilter)?.label}`}
                    accessibilityState={{ expanded: dateOptionsOpen }}
                    onPress={() => setDateOptionsOpen(open => !open)}
                    style={styles.datePicker}
                  >
                    <Text style={styles.dateText}>{DATE_FILTERS.find(filter => filter.value === dateFilter)?.label}</Text>
                    <Text style={styles.dateIcon} accessibilityElementsHidden importantForAccessibility="no">▦</Text>
                  </Pressable>
                  {dateOptionsOpen ? (
                    <View style={styles.dateOptions}>
                      {DATE_FILTERS.map(filter => (
                        <Pressable
                          key={filter.value}
                          accessibilityRole="button"
                          accessibilityState={{ selected: dateFilter === filter.value }}
                          onPress={() => {
                            setDateFilter(filter.value);
                            setDateOptionsOpen(false);
                          }}
                          style={styles.dateOption}
                        >
                          <Text style={[styles.dateOptionText, dateFilter === filter.value && styles.dateOptionSelected]}>{filter.label}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Results</Text>
              <Text style={styles.resultsCount}>{posts.length}{hasMore ? '+' : ''} {posts.length === 1 ? 'post' : 'posts'}</Text>
            </View>
          </View>
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
              {query.trim() || location.trim() || dateFilter !== 'any' || category !== 'All' || typeFilter !== 'All'
                ? 'No posts match your filters. Try changing or clearing them.'
                : 'No posts from other students yet.'}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    minWidth: theme.dimensions.touchTarget,
    minHeight: theme.dimensions.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: theme.colors.text,
  },
  filters: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  filterScroll: {
    flexGrow: 0,
  },
  listHeader: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  filterHeading: {
    ...theme.typography.caption,
    fontFamily: theme.typography.semibold,
    color: theme.colors.muted,
  },
  filterError: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
  searchPanel: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  dateGroup: {
    gap: theme.spacing.sm,
  },
  fieldLabel: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  datePicker: {
    minHeight: theme.dimensions.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    ...theme.typography.body,
    color: theme.colors.body,
  },
  dateIcon: {
    color: theme.colors.muted,
    fontSize: 20,
  },
  dateOptions: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  dateOption: {
    minHeight: theme.dimensions.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  dateOptionText: {
    ...theme.typography.body,
    color: theme.colors.body,
  },
  dateOptionSelected: {
    color: theme.colors.text,
    fontFamily: theme.typography.semibold,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
  },
  resultsTitle: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  resultsCount: {
    ...theme.typography.body,
    color: theme.colors.muted,
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

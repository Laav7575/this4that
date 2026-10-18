import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button, Input } from '../../components/ui';
import { PostCard } from '../../components/posts/PostCard';
import { theme } from '../../constants/theme';
import { getPostCategories, getPosts, getProfiles } from '../../services/backend';
import type { PostRow } from '../../types/database';

const PAGE_SIZE = 50;
type Status = 'loading' | 'ready' | 'error';

export default function Search() {
	const { width } = useWindowDimensions();
	const columns = width < 600 ? 1 : width < 1000 ? 2 : 3;
	const [posts, setPosts] = useState<PostRow[]>([]);
	const [names, setNames] = useState<Record<string, string>>({});
	const [query, setQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [categories, setCategories] = useState<string[]>([]);
	const [category, setCategory] = useState('All');
	const [type, setType] = useState<'All' | PostRow['type']>('All');
	const [status, setStatus] = useState<Status>('loading');
	const [error, setError] = useState('');
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const nextOffset = useRef(0);
	const loadingRef = useRef(false);
	const requestId = useRef(0);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 300);
		return () => clearTimeout(timer);
	}, [query]);

	const loadCategories = useCallback(async () => {
		try {
			setCategories(await getPostCategories());
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not load post categories.');
		}
	}, []);

	const load = useCallback(async (reset = true) => {
		if (!reset && loadingRef.current) return;
		const currentRequest = reset ? ++requestId.current : requestId.current;
		loadingRef.current = true;
		setError('');
		if (reset) {
			nextOffset.current = 0;
			setStatus('loading');
			setHasMore(true);
			setPosts([]);
		} else {
			setLoadingMore(true);
		}

		try {
			const offset = nextOffset.current;
			const rows = await getPosts({
				offset,
				limit: PAGE_SIZE,
				category: category === 'All' ? undefined : category,
				type: type === 'All' ? undefined : type as PostRow['type'],
				search: debouncedQuery.trim() || undefined,
			});
			if (currentRequest !== requestId.current) return;
			const authorIds = Array.from(new Set(rows.map(post => post.author_id)));
			const profiles = await getProfiles(authorIds);
			const namesById: Record<string, string> = {};
			profiles.forEach(profile => {
				namesById[profile.id] = profile.name;
			});

			if (currentRequest !== requestId.current) return;
			nextOffset.current = offset + rows.length;
			setHasMore(rows.length === PAGE_SIZE);
			setPosts(current => {
				if (reset) return rows;
				const knownIds = new Set(current.map(post => post.id));
				return [...current, ...rows.filter(post => !knownIds.has(post.id))];
			});
			setNames(current => ({ ...current, ...namesById }));
			setStatus('ready');
		} catch (cause) {
			if (currentRequest !== requestId.current) return;
			const message = cause instanceof Error ? cause.message : 'Could not load posts.';
			setError(message);
			if (reset) setStatus('error');
		} finally {
			if (currentRequest === requestId.current) {
				loadingRef.current = false;
				setLoadingMore(false);
				setRefreshing(false);
			}
		}
	}, [category, debouncedQuery, type]);

	useFocusEffect(useCallback(() => {
		void load();
	}, [load]));
	useFocusEffect(useCallback(() => {
		void loadCategories();
	}, [loadCategories]));

	const filters = (values: string[], selected: string, onSelect: (value: string) => void, label: string) => (
		<FlatList
			horizontal
			data={values}
			keyExtractor={value => value}
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.filters}
			accessibilityLabel={label}
			renderItem={({ item }) => {
				const active = item === selected;
				return (
					<Pressable
						accessibilityRole="button"
						accessibilityState={{ selected: active }}
						onPress={() => onSelect(item)}
						style={[styles.filter, active && styles.filterActive]}
					>
						<Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
					</Pressable>
				);
			}}
		/>
	);

	return (
		<View style={styles.fill}>
			<FlatList
				key={columns}
				numColumns={columns}
				data={posts}
				keyExtractor={post => post.id}
				renderItem={({ item }) => (
					<View style={[styles.cell, {
						flexBasis: `${100 / columns}%`,
						maxWidth: `${100 / columns}%`,
						paddingHorizontal: columns > 1 ? theme.spacing.sm : 0,
					}]}>
						<PostCard post={item} name={names[item.author_id] ?? 'Student'} />
					</View>
				)}
				contentContainerStyle={[styles.list, columns > 1 && styles.listWide]}
				onRefresh={() => { setRefreshing(true); void load(); }}
				refreshing={refreshing}
				onEndReached={() => {
					if (posts.length > 0 && hasMore && status === 'ready' && !loadingRef.current) void load(false);
				}}
				onEndReachedThreshold={0.5}
				ListHeaderComponent={(
					<View style={styles.header}>
						<Text accessibilityRole="header" style={styles.heading}>Search posts</Text>
						<Input label="Search" placeholder="Title, details, category, or location" value={query} onChangeText={setQuery} returnKeyType="search" />
						{filters(
							['All', 'Requesting', 'Offering'],
							type === 'Request' ? 'Requesting' : type === 'Offer' ? 'Offering' : 'All',
							value => setType(value === 'Requesting' ? 'Request' : value === 'Offering' ? 'Offer' : 'All'),
							'Filter by post type',
						)}
						{filters(['All', ...categories], category, setCategory, 'Filter by category')}
						{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
					</View>
				)}
				ListFooterComponent={loadingMore
					? <ActivityIndicator style={styles.footer} accessibilityLabel="Loading more posts" />
					: hasMore && status === 'ready'
						? <Button label="Load more posts" variant="secondary" onPress={() => { void load(false); }} />
						: null}
				ListEmptyComponent={status === 'loading'
					? <ActivityIndicator style={styles.state} accessibilityLabel="Loading posts" />
					: status === 'error'
						? <Pressable onPress={() => { void load(); }} style={styles.state}><Text style={styles.empty}>Could not load posts. Tap to retry.</Text></Pressable>
						: <Text style={styles.empty}>{query.trim() || category !== 'All' || type !== 'All' ? 'No posts match your search.' : 'No posts are available yet.'}</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: { flex: 1, backgroundColor: theme.colors.background },
	list: { padding: theme.spacing.lg, gap: theme.spacing.md, width: '100%', maxWidth: theme.dimensions.contentMaxWidth, alignSelf: 'center', paddingBottom: theme.spacing.xxxl },
	listWide: { maxWidth: 1200, paddingHorizontal: theme.spacing.lg - theme.spacing.sm },
	cell: { flexBasis: '100%', maxWidth: '100%' },
	header: { gap: theme.spacing.md, paddingBottom: theme.spacing.sm },
	heading: { ...theme.typography.heading, color: theme.colors.text },
	filters: { gap: theme.spacing.sm },
	filter: { minHeight: theme.dimensions.touchTarget, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.lg, justifyContent: 'center' },
	filterActive: { backgroundColor: theme.colors.text, borderColor: theme.colors.text },
	filterText: { ...theme.typography.label, color: theme.colors.text },
	filterTextActive: { color: theme.colors.surface },
	error: { ...theme.typography.caption, color: theme.colors.error },
	state: { paddingVertical: theme.spacing.xxxl },
	empty: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center', paddingVertical: theme.spacing.xxxl },
	footer: { paddingVertical: theme.spacing.xl },
});

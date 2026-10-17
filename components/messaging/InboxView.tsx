import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, Button } from '../ui';
import { theme } from '../../constants/theme';
import { inboxTime, type InboxItem } from '../../services/messaging';

export function InboxView({ items, userId, loading, error, onRefresh, onOpen, onExplore }: {
  items: InboxItem[]; userId: string; loading: boolean; error: string;
  onRefresh: () => void; onOpen: (id: string) => void; onExplore: () => void;
}) {
  const [query, setQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = items.filter(item => item.unread).length;
  const visible = useMemo(() => items.filter(item => (!unreadOnly || item.unread) &&
    `${item.person?.name ?? ''} ${item.latest?.content ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.latest?.timestamp ?? b.conversation.created_at).localeCompare(a.latest?.timestamp ?? a.conversation.created_at)),
  [items, query, unreadOnly]);
  return <FlatList data={visible} keyExtractor={item => item.conversation.id} style={styles.list}
    contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={onRefresh}
    ListHeaderComponent={<View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>A little help starts with a hello.</Text>
      <View style={styles.search}>
        <Image source={require('../../assets/icons/messaging/search.svg')} style={styles.searchIcon} contentFit="contain" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search messages" accessibilityLabel="Search messages"
          placeholderTextColor={theme.colors.muted} autoCapitalize="none" returnKeyType="search" style={styles.searchInput} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable>}
      </View>
      <View style={styles.filters}>
        {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button" accessibilityState={{ selected: unreadOnly === value }}
          onPress={() => setUnreadOnly(value)} style={[styles.filter, unreadOnly === value && styles.selected]}>
          <Text style={styles.filterText}>{value ? `Unread (${unread})` : 'All messages'}</Text>
        </Pressable>)}
      </View>
      {!!error && <View style={styles.feedback}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Button label="Retry" variant="secondary" onPress={onRefresh} /></View>}
    </View>}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.person?.name ?? 'Student'}, ${item.unread ? 'unread, ' : ''}${item.latest?.content ?? 'Start a conversation'}`}
      onPress={() => onOpen(item.conversation.id)} style={({ pressed }) => [styles.row, pressed && styles.selected]}>
      <Avatar name={item.person?.name ?? 'Student'} uri={item.person?.avatar ?? undefined} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}><Text numberOfLines={1} style={styles.name}>{item.person?.name ?? 'Student'}</Text>
          <Text style={styles.time}>{inboxTime(item.latest?.timestamp ?? item.conversation.created_at)}</Text></View>
        <Text numberOfLines={1} style={styles.preview}>{item.latest ? `${item.latest.sender_id === userId ? 'You: ' : ''}${item.latest.content}` : 'Say hello and arrange your exchange.'}</Text>
      </View>
      {item.unread && <Image source={require('../../assets/icons/messaging/unread.svg')} style={styles.dot} contentFit="contain" />}
    </Pressable>}
    ListEmptyComponent={<View style={styles.empty}>
      {loading ? <ActivityIndicator color={theme.colors.primary} accessibilityLabel="Loading messages" /> : !error && <>
        <Text style={styles.emptyTitle}>{query ? 'No matching conversations' : unreadOnly ? 'You’re all caught up' : 'Your next exchange starts here'}</Text>
        <Text style={styles.emptyText}>{query ? 'Try another name or a word from your messages.' : unreadOnly ? 'New messages will appear here.' : 'Find a service and message a student to start your first exchange.'}</Text>
        {(!query && !unreadOnly) && <Button label="Explore services" onPress={onExplore} />}
      </>}
    </View>}
    ListFooterComponent={<Text style={styles.footer}>Connect. Exchange. Help each other out.</Text>} />;
}
const styles = StyleSheet.create({
  list: { flex: 1, width: '100%', maxWidth: theme.dimensions.contentMaxWidth, alignSelf: 'center', backgroundColor: theme.colors.background },
  listContent: { flexGrow: 1, paddingBottom: 24 }, intro: { padding: 16, paddingTop: 20, gap: 12, paddingBottom: 20 },
  title: { fontFamily: theme.typography.semibold, fontSize: 26, lineHeight: 36, color: theme.colors.text },
  subtitle: { ...theme.typography.body, fontSize: 13, lineHeight: 18, color: theme.colors.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, borderRadius: 8, minHeight: 44 }, searchIcon: { width: 18, height: 18 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 44, ...theme.typography.body, color: theme.colors.text, paddingRight: 12 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, clearText: { fontSize: 22, color: theme.colors.muted },
  filters: { flexDirection: 'row', gap: 8 }, filter: { paddingHorizontal: 10, minHeight: 36, justifyContent: 'center',
    borderRadius: theme.radius.full, backgroundColor: theme.colors.surface }, filterText: { ...theme.typography.label, color: theme.colors.text },
  selected: { backgroundColor: theme.colors.highlight },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, minHeight: 88,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  rowBody: { flex: 1, minWidth: 0, gap: 4 }, rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text, flex: 1 },
  time: { ...theme.typography.caption, color: theme.colors.muted }, preview: { ...theme.typography.caption, color: theme.colors.muted },
  dot: { width: 10, height: 10 }, empty: { padding: 24, gap: 16, alignItems: 'center' },
  emptyTitle: { ...theme.typography.heading, color: theme.colors.text, textAlign: 'center' },
  emptyText: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center' },
  feedback: { gap: 12 }, error: { ...theme.typography.body, color: theme.colors.error },
  footer: { ...theme.typography.caption, color: theme.colors.muted, padding: 16, paddingTop: 32 },
});

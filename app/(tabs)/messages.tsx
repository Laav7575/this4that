import { useCallback, useState } from 'react';
import { router, useFocusEffect, Tabs } from 'expo-router';
import { AppState, View } from 'react-native';
import { InboxView } from '../../components/messaging/InboxView';
import { HeaderIcon } from '../../components/messaging/Navigation';
import { theme } from '../../constants/theme';
import { loadInbox, messagingUser, type InboxItem } from '../../services/messaging';

export default function Messages() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [userId, setUserId] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    const load = async (initial: boolean) => {
      if (busy) return;
      busy = true;
      if (initial) { setLoading(true); setError(''); }
      try {
        const me = await messagingUser();
        const result: InboxItem[] = [];
        // Full paging keeps search and unread counts accurate for the entire inbox.
        for (let offset = 0; active; offset += 20) {
          const page = await loadInbox(me, offset);
          result.push(...page);
          if (page.length < 20) break;
        }
        if (active) { setUserId(me); setItems(result); setError(''); }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load messages. Try again.');
      } finally { busy = false; if (active) setLoading(false); }
    };
    void load(true);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(false); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]));
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <Tabs.Screen options={{ title: 'Messages', headerTitle: '',
      headerLeft: () => <HeaderIcon icon="settings" label="My profile and settings" onPress={() => router.push('/profile')} />,
      headerRight: () => <HeaderIcon icon="add" label="Create a post" onPress={() => router.push('/post/new')} /> }} />
    <InboxView items={items} userId={userId} loading={loading} error={error} onRefresh={() => setRefresh(n => n + 1)}
      onOpen={id => router.push({ pathname: '/chat/[id]', params: { id } })} onExplore={() => router.push('/home')} />
  </View>;
}

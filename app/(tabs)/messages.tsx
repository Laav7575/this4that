import { useCallback, useState } from 'react';
import { router, useFocusEffect, Tabs } from 'expo-router';
import { AppState, View } from 'react-native';
import { InboxView } from '../../components/messaging/InboxView';
import { theme } from '../../constants/theme';
import { DEMO } from '../../lib/demo';
import { getMessageEmailNotifications, loadInbox, messagingUser, setMessageEmailNotifications, type InboxItem } from '../../services/messaging';

export default function Messages() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [userId, setUserId] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loadingEmailPreference, setLoadingEmailPreference] = useState(true);
  const [savingEmailPreference, setSavingEmailPreference] = useState(false);
  const [emailPreferenceError, setEmailPreferenceError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    const load = async (initial: boolean) => {
      if (busy) return;
      busy = true;
      if (initial) { setLoading(true); setError(''); }
      try {
        const me = await messagingUser();
        if (initial) setLoadingEmailPreference(true);
        try {
          const enabled = await getMessageEmailNotifications(me);
          if (active) { setEmailNotifications(enabled); setEmailPreferenceError(''); }
        } catch (e) {
          if (active) setEmailPreferenceError(e instanceof Error ? e.message : 'Could not load the email notification preference.');
        } finally {
          if (active) setLoadingEmailPreference(false);
        }
        const result: InboxItem[] = [];
        // Full paging keeps search and unread counts accurate for the entire inbox.
        for (let offset = 0; active; offset += 20) {
          const page = await loadInbox(me, offset);
          result.push(...page);
          if (page.length < 20) break;
        }
        if (active) { setUserId(me); setItems(result); setError(''); }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Could not load messages. Try again.');
          setLoadingEmailPreference(false);
          setEmailPreferenceError('Could not load the email notification preference.');
        }
      } finally { busy = false; if (active) setLoading(false); }
    };
    void load(true);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(false); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]));
  const changeEmailNotifications = async (enabled: boolean) => {
    setSavingEmailPreference(true);
    setEmailPreferenceError('');
    try {
      await setMessageEmailNotifications(userId, enabled);
      setEmailNotifications(enabled);
    } catch (e) {
      setEmailPreferenceError(e instanceof Error ? e.message : 'Could not save the email notification preference.');
    } finally { setSavingEmailPreference(false); }
  };
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    {/* No header shortcuts: Profile is already a tab, and new posts start from Home (SCRUM-31/33). */}
    <Tabs.Screen options={{ title: 'Messages', headerTitle: '', headerLeft: () => null, headerRight: () => null }} />
    <InboxView items={items} userId={userId} loading={loading} error={error} onRefresh={() => setRefresh(n => n + 1)}
      onOpen={id => router.push({ pathname: '/chat/[id]', params: { id } })} onExplore={() => router.push('/home')}
      emailNotifications={emailNotifications} loadingEmailPreference={loadingEmailPreference}
      savingEmailPreference={savingEmailPreference} emailPreferenceError={emailPreferenceError}
      notificationsAvailable={!DEMO} onEmailNotificationsChange={enabled => { void changeEmailNotifications(enabled); }}
      onRetryEmailPreference={() => setRefresh(n => n + 1)} />
  </View>;
}

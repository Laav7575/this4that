import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatView } from '../../components/messaging/ChatView';
import { ChatNavigation, HeaderIcon } from '../../components/messaging/Navigation';
import { Button } from '../../components/ui';
import { theme } from '../../constants/theme';
import { getMessages, sendMessage } from '../../services/backend';
import { getEarlierMessages, loadChatDetails, markConversationRead, mergeMessages, messagingUser } from '../../services/messaging';
import type { MessageRow, PostRow, ProfileRow } from '../../types/database';

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Chat key={id} id={id} />;
}
function Chat({ id }: { id: string }) {
  const headerHeight = useHeaderHeight();
  const [person, setPerson] = useState<ProfileRow | null>(null);
  const [post, setPost] = useState<PostRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [revision, setRevision] = useState(0);
  const sendingRef = useRef(false);
  const olderRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    const load = async (initial: boolean) => {
      if (busy) return;
      busy = true;
      if (initial) { setLoading(true); setError(''); }
      try {
        const me = await messagingUser();
        if (!id) throw new Error('No conversation was selected.');
        if (initial) {
          const details = await loadChatDetails(id, me);
          if (!active) return;
          setPerson(details.person); setPost(details.post); setUserId(me);
        }
        const history = await getMessages(id, 0, 50);
        if (!active) return;
        setMessages(current => mergeMessages(current, history));
        if (initial) setHasOlder(history.length === 50);
        setReady(true); setError('');
        const newestIncoming = history.find(message => message.sender_id !== me);
        if (newestIncoming) await markConversationRead(me, id, newestIncoming.timestamp).catch(() => {
          if (active) setError('Messages loaded, but unread status could not be saved on this device.');
        });
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Could not load this conversation.'); }
      finally { busy = false; if (active) setLoading(false); }
    };
    void load(true);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(false); }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [id, revision]));
  const send = async () => {
    const content = draft.trim();
    if (!content || sendingRef.current || !ready) return;
    sendingRef.current = true; setSending(true); setSendError('');
    try {
      const message = await sendMessage(id, content);
      if (mounted.current) { setMessages(current => mergeMessages(current, [message])); setDraft(''); }
    } catch (e) { if (mounted.current) setSendError(e instanceof Error ? e.message : 'Message could not be sent. Your draft is saved; try again.'); }
    finally { sendingRef.current = false; if (mounted.current) setSending(false); }
  };
  const older = async () => {
    if (olderRef.current || !messages[0]) return;
    olderRef.current = true; setLoadingOlder(true);
    try {
      const history = await getEarlierMessages(id, messages[0]);
      if (mounted.current) { setMessages(current => mergeMessages(current, history)); setHasOlder(history.length === 50); setError(''); }
    } catch { if (mounted.current) setError('Could not load earlier messages. Try again.'); }
    finally { olderRef.current = false; if (mounted.current) setLoadingOlder(false); }
  };
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <Stack.Screen options={{ headerTitle: '', headerBackVisible: false,
      headerLeft: () => <HeaderIcon icon="back" label="Back to messages" onPress={() => router.dismissTo('/messages')} /> }} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      {loading && !ready ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={theme.colors.primary} accessibilityLabel="Loading conversation" /></View> :
        !ready ? <View style={{ padding: 24, gap: 16 }}><Text accessibilityRole="alert" style={{ ...theme.typography.body, color: theme.colors.error }}>{error}</Text>
          <Button label="Try again" onPress={() => setRevision(n => n + 1)} /><Button label="Back to messages" variant="secondary" onPress={() => router.dismissTo('/messages')} /></View> :
          <ChatView person={person} post={post} messages={messages} userId={userId} draft={draft} onDraft={setDraft} sending={sending}
            error={sendError || error} onSend={() => { void send(); }} onRefresh={() => setRevision(n => n + 1)}
            onProfile={() => { if (person) router.push({ pathname: '/user/[id]', params: { id: person.id } }); }}
            onPost={() => { if (post) router.push({ pathname: '/post/[id]', params: { id: post.id } }); }}
            hasOlder={hasOlder} loadingOlder={loadingOlder} onOlder={() => { void older(); }} />}
    </KeyboardAvoidingView>
    <ChatNavigation />
  </SafeAreaView>;
}

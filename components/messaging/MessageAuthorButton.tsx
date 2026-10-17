import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../ui';
import { theme } from '../../constants/theme';
import { messagingUser, openConversation } from '../../services/messaging';

/** Starts (or reopens) a chat with a post's author. Pass `userId` when the caller already knows who is signed in. */
export function MessageAuthorButton({ authorId, postId, userId, compact = false }: {
  authorId: string; postId: string; userId?: string; compact?: boolean;
}) {
  const [sessionUser, setSessionUser] = useState<string>();
  const me = userId ?? sessionUser;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (userId) return;
    let active = true;
    void messagingUser().then(id => { if (active) setSessionUser(id); }).catch(() => {});
    return () => { active = false; };
  }, [userId]);
  if (!me || me === authorId) return null;
  const open = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const id = await openConversation(authorId, postId);
      router.push({ pathname: '/chat/[id]', params: { id } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start a conversation. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={{ gap: theme.spacing.sm }}>
    <Button label={compact ? 'Message' : 'Message student'} variant={compact ? 'secondary' : 'primary'} loading={busy}
      accessibilityLabel="Message the student who posted this" onPress={() => { void open(); }} />
    {!!error && <Text accessibilityRole="alert" style={{ ...theme.typography.body, color: theme.colors.error }}>{error}</Text>}
  </View>;
}

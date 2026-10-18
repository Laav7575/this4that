import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { ProfileView } from '../../components/profile/ProfileView';
import { ProfileStatus } from '../../components/profile/ProfileStatus';
import { useProfile } from '../../components/profile/useProfile';
import { theme } from '../../constants/theme';
import { createConversation } from '../../services/backend';
import { getMyUserId } from '../../services/profileData';

export default function PublicProfile() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { state, reload } = useProfile(id);
  const [myId, setMyId] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { getMyUserId().then(setMyId).catch(() => setMyId(null)); }, []);

  const message = async () => {
    if (!id) return;
    setMessaging(true); setError(undefined);
    try {
      const conversationId = await createConversation(id);
      router.push({ pathname: '/chat/[id]', params: { id: conversationId } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a conversation.');
    } finally { setMessaging(false); }
  };

  return (
    <Screen>
      <ProfileStatus
        state={state}
        onRetry={reload}
        notFoundText="We couldn't find that student."
        notFoundAction={{
          label: 'Back to Home',
          onPress: () => router.replace('/home'),
        }}
      />
      {state.status === 'ready' && (
        <ProfileView
          profile={state.profile}
          posts={state.posts}
          stats={state.stats}
          isSelf={!!myId && myId === id}
          onMessage={message}
          messageLoading={messaging}
        />
      )}
      {error && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.error }]}
        >
          {error}
        </Text>
      )}
    </Screen>
  );
}
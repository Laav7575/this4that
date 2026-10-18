import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/ui';
import { ProfileView } from '../../components/profile/ProfileView';
import { ProfileStatus } from '../../components/profile/ProfileStatus';
import { useProfile } from '../../components/profile/useProfile';
import { theme } from '../../constants/theme';
import { signOut } from '../../services/auth';
import { getMyUserId } from '../../services/profileData';

export default function MyProfile() {
  const [myId, setMyId] = useState<string | null | undefined>(undefined);
  const [idError, setIdError] = useState<string>();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string>();
  const { state, reload } = useProfile(myId ?? undefined);

  useEffect(() => {
    getMyUserId()
      .then(setMyId)
      .catch((e) => {
        setIdError(
          e instanceof Error ? e.message : 'Could not read your session.',
        );
        setMyId(null);
      });
  }, []);

  const logOut = async () => {
    setSigningOut(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not sign out. Try again.',
      );
      setSigningOut(false);
    }
  };

  const signOutButton = (
    <>
      {error && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.error }]}
        >
          {error}
        </Text>
      )}
      <Button
        label="Sign out"
        variant="secondary"
        onPress={logOut}
        loading={signingOut}
      />
    </>
  );

  return (
    <Screen>
      {myId === undefined ? (
        <ProfileStatus state={{ status: 'loading' }} onRetry={reload} />
      ) : myId === null ? (
        <ProfileStatus
          state={{
            status: 'error',
            message: idError ?? 'Sign in to see your profile.',
          }}
          onRetry={() => router.replace('/login')}
        />
      ) : (
        <>
          <ProfileStatus
            state={state}
            onRetry={reload}
            notFoundText="You haven't set up your profile yet."
            notFoundAction={{
              label: 'Create my profile',
              onPress: () => router.push('/edit-profile'),
            }}
          />
          {state.status === 'ready' && (
            <ProfileView
              profile={state.profile}
              posts={state.posts}
              stats={state.stats}
              isSelf
            />
          )}
        </>
      )}
      {signOutButton}
    </Screen>
  );
}
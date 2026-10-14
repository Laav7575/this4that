import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { currentUser } from '../../data/mockData';
import { signOut } from '../../services/auth';

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const logOut = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign out. Try again.');
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={[theme.typography.heading, { color: theme.colors.text }]}>My Profile</Text>
      <Card>
        <Text style={[theme.typography.body, { color: theme.colors.body }]}>
          Feature implementation belongs to the assigned screen developer.
        </Text>
      </Card>
      <Button
        label="Open public profile"
        variant="secondary"
        onPress={() => router.push({ pathname: '/user/[id]', params: { id: currentUser.id } })}
      />
      {error && <Text accessibilityRole="alert" style={[theme.typography.body, { color: theme.colors.error }]}>{error}</Text>}
      <Button label="Sign out" onPress={logOut} loading={loading} />
    </Screen>
  );
}

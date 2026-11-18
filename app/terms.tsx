import { useContext, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/ui';
import { theme } from '../constants/theme';
import { TermsAcceptanceContext } from '../lib/terms';
import { signOut } from '../services/auth';

export default function TermsScreen() {
  const accept = useContext(TermsAcceptanceContext);
  const [action, setAction] = useState<'accept' | 'decline'>();
  const [error, setError] = useState<string>();

  async function submit(next: 'accept' | 'decline') {
    if (action || !accept) return;
    setAction(next);
    setError(undefined);
    try {
      await (next === 'accept' ? accept() : signOut());
    } catch {
      setError(next === 'accept'
        ? 'Could not save your acceptance. Try again.'
        : 'Could not sign out. Try again.');
    } finally {
      setAction(undefined);
    }
  }

  return (
    <Screen>
      <Text style={theme.typography.body}>
        This4That helps University of Waterloo students offer and request favours.
        Use your own account and keep your sign-in details private.
      </Text>
      <Text style={theme.typography.body}>
        Treat other members respectfully. Keep listings accurate, respect other people’s privacy,
        and only share information you have permission to share.
      </Text>
      <Text style={theme.typography.body}>
        You can decline any exchange.
      </Text>
      <Text accessibilityRole="header" style={theme.typography.heading}>Member exchanges</Text>
      <Text style={theme.typography.body}>
        This4That provides a platform for members to find one another and arrange favours.
        Members decide whether to participate, agree on the details directly, and are responsible
        for their own conduct. The platform operator does not supervise exchanges or guarantee
        that a member will complete a favour or perform it safely.
      </Text>
      <Text accessibilityRole="header" style={theme.typography.heading}>Limitation of liability</Text>
      <Text style={theme.typography.body}>
        To the extent permitted by applicable law, the platform operator is not liable for loss
        or damage caused by another member’s conduct or failure to perform an agreed favour.
        Nothing in these terms limits any right, remedy, or liability that cannot lawfully be
        limited or excluded.
      </Text>
      <Text style={theme.typography.body}>
        If you decline these terms, you’ll be signed out and can review them again when you return.
      </Text>
      {error && <Text accessibilityRole="alert" style={{ color: theme.colors.error }}>{error}</Text>}
      <Button label="Accept and continue" onPress={() => submit('accept')} loading={action === 'accept'} disabled={!accept || action === 'decline'} />
      <Button label="Decline" variant="secondary" onPress={() => submit('decline')} loading={action === 'decline'} disabled={!accept || action === 'accept'} />
    </Screen>
  );
}

import { ActivityIndicator, Text } from 'react-native';
import { Button, Card } from '../ui';
import { theme } from '../../constants/theme';
import type { ProfileState } from './useProfile';

/** Loading / not found / error states shared by both profile screens. Returns null when ready. */
export function ProfileStatus({
  state,
  onRetry,
  notFoundText = 'This profile does not exist.',
  notFoundAction,
}: {
  state: ProfileState;
  onRetry: () => void;
  notFoundText?: string;
  notFoundAction?: { label: string; onPress: () => void };
}) {
  if (state.status === 'ready') return null;
  if (state.status === 'loading')
    return (
      <ActivityIndicator
        accessibilityLabel="Loading profile"
        style={{ marginTop: theme.spacing.xxxl }}
      />
    );
  const text = state.status === 'notfound' ? notFoundText : state.message;
  return (
    <Card>
      <Text
        accessibilityRole="alert"
        style={[theme.typography.body, { color: theme.colors.body }]}
      >
        {text}
      </Text>
      {state.status === 'notfound' && notFoundAction ? (
        <Button label={notFoundAction.label} onPress={notFoundAction.onPress} />
      ) : (
        <Button label="Try again" variant="secondary" onPress={onRetry} />
      )}
    </Card>
  );
}
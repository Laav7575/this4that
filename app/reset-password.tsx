import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { Button, Input } from '../components/ui';
import { theme } from '../constants/theme';
import { startRecoverySession, updatePassword } from '../services/auth';

type Status = 'checking' | 'ready' | 'invalid';

/** Supabase puts the tokens after "#" (sometimes "?") in the emailed link. */
function readParams(url: string) {
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  return new URLSearchParams(`${query}&${hash}`);
}

export default function ResetPassword() {
  const insets = useSafeAreaInsets();
  const url = Linking.useURL();
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (!url) return;
    const params = readParams(url);
    const problem = params.get('error_description');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (problem || !accessToken || !refreshToken) {
      setMessage(problem ? problem.replace(/\+/g, ' ') : 'This reset link is missing or has expired. Request a new one from the sign in screen.');
      setStatus('invalid');
      return;
    }
    startRecoverySession(accessToken, refreshToken)
      .then(() => setStatus('ready'))
      .catch(error => {
        setMessage(error instanceof Error ? error.message : 'This reset link could not be used.');
        setStatus('invalid');
      });
  }, [url]);

  const errors = {
    password: password.length < 8 ? 'Use at least 8 characters.' : undefined,
    confirm: confirm !== password ? 'Passwords do not match.' : undefined,
  };
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);

  const submit = async () => {
    setSubmitted(true);
    setFormError(undefined);
    if (errors.password || errors.confirm) return;
    setLoading(true);
    try {
      await updatePassword(password);
      router.replace('/home'); // the recovery session is already signed in
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update your password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />
      <View style={styles.hero}>
        <Text style={styles.brand}>This4That</Text>
        <Text accessibilityRole="header" style={styles.title}>New password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>
      </View>

      {status === 'checking' && <Text style={styles.body}>Checking your reset link…</Text>}

      {status === 'invalid' && (
        <>
          <Text accessibilityRole="alert" style={styles.error}>{message}</Text>
          <Button label="Back to sign in" onPress={() => router.replace('/login')} />
        </>
      )}

      {status === 'ready' && (
        <>
          <View style={styles.form}>
            <Input
              label="New password"
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              error={shown('password')}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
            />
            <Input
              label="Confirm new password"
              placeholder="Type it again"
              value={confirm}
              onChangeText={setConfirm}
              error={shown('confirm')}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
              onSubmitEditing={submit}
            />
          </View>
          {formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
          <Button label="Update password" onPress={submit} loading={loading} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: theme.colors.highlight, borderRadius: theme.radius.lg, padding: theme.spacing.xxl, gap: theme.spacing.md },
  brand: { ...theme.typography.heading, color: theme.colors.text },
  title: { ...theme.typography.heading, fontSize: 40, lineHeight: 44, color: theme.colors.text },
  subtitle: { ...theme.typography.body, fontSize: 15, lineHeight: 22, color: theme.colors.text },
  form: { gap: theme.spacing.lg },
  body: { ...theme.typography.body, color: theme.colors.body },
  error: { ...theme.typography.body, color: theme.colors.error },
});

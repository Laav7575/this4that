import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { Button, Input } from '../components/ui';
import { theme } from '../constants/theme';

type Mode = 'signin' | 'signup';

// Only University of Waterloo student emails are allowed.
const isWaterlooEmail = (email: string) => /^[^\s@]+@uwaterloo\.ca$/i.test(email.trim());

export default function Login() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isSignUp = mode === 'signup';

  const errors = {
    name: isSignUp && !name.trim() ? 'Enter your full name.' : undefined,
    email: isWaterlooEmail(email) ? undefined : 'Use your @uwaterloo.ca email.',
    password: isSignUp
      ? password.length < 8 ? 'Use at least 8 characters.' : undefined
      : password ? undefined : 'Enter your password.',
  };
  // Errors only appear after the first submit attempt.
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const hasErrors = Boolean(errors.name || errors.email || errors.password);

  const submit = () => {
    setSubmitted(true);
    // No real authentication yet (see README): a valid form goes straight to Home.
    if (!hasErrors) router.replace('/home');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />

      <View style={styles.hero}>
        <Text style={styles.brand}>This4That</Text>
        <Text accessibilityRole="header" style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Trade favours with fellow University of Waterloo students.</Text>
      </View>

      <View style={styles.toggle}>
        {(['signin', 'signup'] as const).map(option => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => switchMode(option)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[theme.typography.button, { color: active ? theme.colors.surface : theme.colors.text }]}>
                {option === 'signin' ? 'Sign in' : 'Sign up'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <Input
            label="Full name"
            placeholder="Alex Morgan"
            value={name}
            onChangeText={setName}
            error={shown('name')}
            autoComplete="name"
            autoCapitalize="words"
          />
        )}

        <View style={styles.fieldWithHint}>
          <Input
            label="Waterloo email"
            placeholder="name@uwaterloo.ca"
            value={email}
            onChangeText={setEmail}
            error={shown('email')}
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!shown('email') && <Text style={styles.hint}>Only @uwaterloo.ca emails can join.</Text>}
        </View>

        <Input
          label="Password"
          placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
          value={password}
          onChangeText={setPassword}
          error={shown('password')}
          secureTextEntry
          autoComplete={isSignUp ? 'new-password' : 'password'}
          autoCapitalize="none"
          onSubmitEditing={submit}
        />

        {!isSignUp && <Text style={styles.forgot}>Forgot password?</Text>}
      </View>

      <Button label={isSignUp ? 'Create account' : 'Sign in'} onPress={submit} />

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.hint}>or</Text>
        <View style={styles.line} />
      </View>

      {/* Placeholder: Outlook sign-in is mocked like the rest of auth. */}
      <Button variant="secondary" label="Continue with Outlook" onPress={() => router.replace('/home')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.highlight,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  brand: { ...theme.typography.heading, color: theme.colors.text },
  title: { ...theme.typography.heading, fontSize: 40, lineHeight: 44, color: theme.colors.text },
  subtitle: { ...theme.typography.body, fontSize: 15, lineHeight: 22, color: theme.colors.text },
  toggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.highlight,
    borderRadius: theme.radius.md,
    padding: 3,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: theme.dimensions.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md - 2,
  },
  segmentActive: { backgroundColor: theme.colors.text },
  form: { gap: theme.spacing.lg },
  fieldWithHint: { gap: 6 },
  hint: { ...theme.typography.caption, color: theme.colors.muted },
  forgot: { ...theme.typography.label, color: theme.colors.text, alignSelf: 'flex-end' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.border },
});

import { useState } from 'react';
import * as Linking from 'expo-linking';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { Button, Input } from '../components/ui';
import { theme } from '../constants/theme';
import { requestPasswordReset, signIn, signUp } from '../services/auth';
import { createMyProfile, getProfile } from '../services/backend';

type Mode = 'signin' | 'signup' | 'forgot';

// Only University of Waterloo student emails are allowed.
const isWaterlooEmail = (email: string) => /^[^\s@]+@uwaterloo\.ca$/i.test(email.trim());

export default function Login() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  const errors = {
    name: isSignUp && !name.trim() ? 'Enter your full name.' : undefined,
    email: isWaterlooEmail(email) ? undefined : 'Use your @uwaterloo.ca email.',
    password: isForgot
      ? undefined
      : isSignUp
        ? password.length < 8 ? 'Use at least 8 characters.' : undefined
        : password ? undefined : 'Enter your password.',
  };
  // Errors only appear after the first submit attempt.
  const shown = (key: keyof typeof errors) => (submitted ? errors[key] : undefined);
  const hasErrors = Boolean(errors.name || errors.email || errors.password);

  const submit = async () => {
    setSubmitted(true);
    setFormError(undefined);
    setNotice(undefined);
    if (hasErrors) return;
    setLoading(true);
    try {
      if (isForgot) {
        // The emailed link comes back to the reset-password screen (web: this site; Expo Go/app: a deep link).
        await requestPasswordReset(email, Linking.createURL('/reset-password'));
        setNotice('If an account exists for that email, a reset link is on its way. Check your inbox.');
      } else if (isSignUp) {
        await signUp(email, password, name.trim());
        // With email confirmation on, there is no session until the link in the email is opened.
        setMode('signin');
        setSubmitted(false);
        setPassword('');
        setNotice('Check your @uwaterloo.ca inbox to confirm your account, then sign in.');
      } else {
        const { user } = await signIn(email, password);
        // First confirmed sign-in: create the public profile row the feed needs for author names.
        if (!(await getProfile(user.id))) {
          const savedName = typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '';
          await createMyProfile({ name: savedName || email.split('@')[0] });
        }
        // No manual redirect needed: the root layout sends signed-in users to Home.
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
    setFormError(undefined);
    setNotice(undefined);
  };

  return (
    <Screen>
      <View style={{ height: insets.top }} />

      <View style={styles.hero}>
        <Text style={styles.brand}>This4That</Text>
        <Text accessibilityRole="header" style={styles.title}>{isForgot ? 'Reset password' : 'Welcome'}</Text>
        <Text style={styles.subtitle}>
          {isForgot ? 'Enter your @uwaterloo.ca email and we will send you a reset link.' : 'Trade favours with fellow University of Waterloo students.'}
        </Text>
      </View>

      {!isForgot && <View style={styles.toggle}>
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
      </View>}

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

        {!isForgot && (
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
        )}

        {mode === 'signin' && (
          <Pressable accessibilityRole="button" onPress={() => switchMode('forgot')} style={styles.forgotButton}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        )}
      </View>

      {notice && <Text style={styles.notice}>{notice}</Text>}
      {formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}

      <Button label={isForgot ? 'Send reset link' : isSignUp ? 'Create account' : 'Sign in'} onPress={submit} loading={loading} />
      {isForgot && <Button variant="secondary" label="Back to sign in" onPress={() => switchMode('signin')} />}
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
  forgotButton: { alignSelf: 'flex-end', minHeight: theme.dimensions.touchTarget, justifyContent: 'center' },
  forgot: { ...theme.typography.label, color: theme.colors.text },
  notice: { ...theme.typography.body, color: theme.colors.text, backgroundColor: theme.colors.highlight, borderRadius: theme.radius.md, padding: theme.spacing.md },
  error: { ...theme.typography.body, color: theme.colors.error },
});

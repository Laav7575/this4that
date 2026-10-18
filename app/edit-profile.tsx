import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Input } from '../components/ui';
import { theme } from '../constants/theme';
import { createMyProfile, getProfile, updateMyProfile } from '../services/backend';
import { getMyAuthInfo } from '../services/profileData';

const parseSkills = (text: string) =>
  Array.from(new Set(text.split(',').map(s => s.trim()).filter(Boolean))).slice(0, 20);

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [name, setName] = useState('');
  const [program, setProgram] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<{ name?: string; bio?: string }>({});

  useEffect(() => {
    (async () => {
      try {
        const me = await getMyAuthInfo();
        if (!me.id) {
          router.replace('/login');
          return;
        }
        const profile = await getProfile(me.id);
        setExists(!!profile);
        setName(profile?.name ?? me.name ?? '');
        setProgram(profile?.program ?? '');
        setBio(profile?.bio ?? '');
        setSkills((profile?.skills ?? []).join(', '));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not load your profile.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const problems: typeof fieldError = {};
    if (!name.trim()) problems.name = 'Name is required.';
    else if (name.trim().length > 100)
      problems.name = 'Name must be 100 characters or fewer.';
    if (bio.length > 2000)
      problems.bio = 'Bio must be 2000 characters or fewer.';
    setFieldError(problems);
    if (problems.name || problems.bio) return;
    setSaving(true);
    setError(undefined);
    const input = {
      name: name.trim(),
      program: program.trim(),
      bio: bio.trim(),
      skills: parseSkills(skills),
    };
    try {
      if (exists) await updateMyProfile(input);
      else await createMyProfile(input);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Screen>
        <ActivityIndicator
          accessibilityLabel="Loading"
          style={{ marginTop: theme.spacing.xxxl }}
        />
      </Screen>
    );
  return (
    <Screen>
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        error={fieldError.name}
        autoCapitalize="words"
        maxLength={100}
      />
      <Input
        label="Program"
        value={program}
        onChangeText={setProgram}
        placeholder="e.g. Mathematics"
      />
      <Input
        label="Bio"
        value={bio}
        onChangeText={setBio}
        error={fieldError.bio}
        multiline
        numberOfLines={4}
        style={{ minHeight: 96, textAlignVertical: 'top' }}
        placeholder="Tell neighbours what you're happy to swap."
      />
      <Input
        label="Skills & interests (comma separated)"
        value={skills}
        onChangeText={setSkills}
        placeholder="Calculus tutoring, Meal prep, Plants"
      />
      {error && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.error }]}
        >
          {error}
        </Text>
      )}
      <Button
        label={exists ? 'Save changes' : 'Create profile'}
        onPress={save}
        loading={saving}
      />
      <Button
        label="Cancel"
        variant="secondary"
        onPress={() => router.back()}
        disabled={saving}
      />
    </Screen>
  );
}
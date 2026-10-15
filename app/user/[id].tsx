import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Avatar, Button, Card } from '../../components/ui';
import { theme } from '../../constants/theme';
import { getProfile } from '../../services/backend';
import type { ProfileRow } from '../../types/database';

type Status = 'loading' | 'ready' | 'missing' | 'error';

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = Array.isArray(id) ? id[0] : id;
  const [loaded, setLoaded] = useState<{
    id: string;
    status: Status;
    profile: ProfileRow | null;
    error: string;
  }>({ id: '', status: 'loading', profile: null, error: '' });
  const isCurrentProfile = loaded.id === userId;
  const status: Status = !userId ? 'missing' : isCurrentProfile ? loaded.status : 'loading';
  const profile = isCurrentProfile ? loaded.profile : null;
  const error = isCurrentProfile ? loaded.error : '';

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };

    getProfile(userId).then(result => {
      if (!active) return;
      setLoaded({ id: userId, status: result ? 'ready' : 'missing', profile: result, error: '' });
    }).catch(cause => {
      if (!active) return;
      setLoaded({
        id: userId,
        status: 'error',
        profile: null,
        error: cause instanceof Error ? cause.message : 'Could not load this profile.',
      });
    });

    return () => { active = false; };
  }, [userId]);

  if (status === 'loading') return <Screen><ActivityIndicator accessibilityLabel="Loading profile" /></Screen>;
  if (status === 'missing') return <Screen>
    <Text accessibilityRole="header" style={styles.heading}>Profile not found</Text>
    <Text style={styles.body}>This student profile is unavailable.</Text>
  </Screen>;
  if (status === 'error' || !profile) return <Screen>
    <Text accessibilityRole="header" style={styles.heading}>Unable to load profile</Text>
    <Text accessibilityRole="alert" style={styles.body}>{error}</Text>
    <Button label="Back" variant="secondary" onPress={() => router.back()} />
  </Screen>;

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.heading}>Public Profile</Text>
      <Card>
        <Avatar name={profile.name} uri={profile.avatar ?? undefined} size={theme.dimensions.avatarLarge} />
        <Text style={styles.name}>{profile.name}</Text>
        {profile.program ? <Text style={styles.program}>{profile.program}</Text> : null}
        {profile.bio ? <Text style={styles.body}>{profile.bio}</Text> : null}
      </Card>
      {profile.skills.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Card style={styles.skills}>
            {profile.skills.map(skill => <Text key={skill} style={styles.skill}>{skill}</Text>)}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...theme.typography.heading, color: theme.colors.text },
  name: { ...theme.typography.heading, color: theme.colors.text },
  program: { ...theme.typography.body, color: theme.colors.muted },
  body: { ...theme.typography.body, color: theme.colors.body },
  sectionTitle: { ...theme.typography.heading, color: theme.colors.text },
  skills: { flexDirection: 'row', flexWrap: 'wrap' },
  skill: { ...theme.typography.caption, color: theme.colors.body, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
});

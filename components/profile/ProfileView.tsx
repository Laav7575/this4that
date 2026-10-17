import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, Card } from '../ui';
import { theme } from '../../constants/theme';
import type { ProfileStats } from '../../data/mockProfileStats';
import type { PostRow } from '../../types/database';
import type { ProfileWithMeta } from '../../services/profileData';
import { PostTypeIcon, VerifiedBadge } from './icons';
import { memberSinceYear, timeAgo } from './format';

const SHOW_STATS = false;

type Props = {
  profile: ProfileWithMeta;
  posts: PostRow[];
  stats: ProfileStats;
  isSelf: boolean;
  onMessage?: () => void;
  messageLoading?: boolean;
  footer?: ReactNode; 
};

export function ProfileView({ profile, posts, stats, isSelf, onMessage, messageLoading, footer }: Props) {
  const since = memberSinceYear(profile.created_at);
  const subtitle = [profile.program, since ? `Member since ${since}` : undefined].filter(Boolean).join(' · ');
  const firstName = profile.name.trim().split(/\s+/)[0] || 'them';

  return <>
    <View style={styles.header}>
      <Avatar name={profile.name} uri={profile.avatar ?? undefined} size={theme.dimensions.avatarLarge} />
      <View style={styles.headerText}>
        <View style={styles.nameRow}>
          <Text accessibilityRole="header" style={styles.name}>{profile.name}</Text>
          <VerifiedBadge />
        </View>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!profile.bio && <Text style={[styles.bio, styles.bioRow]}>{profile.bio}</Text>}
    </View>

    {SHOW_STATS && (
      <Card style={styles.stats} accessibilityLabel={`Rating ${stats.rating} from ${stats.ratingCount} ratings, ${stats.exchanges} exchanges, ${stats.showUpRate} percent show-up rate`}>
        <Stat value={`${stats.rating.toFixed(1)} ★`} label={`${stats.ratingCount} ratings`} />
        <Stat value={`${stats.exchanges}`} label="exchanges" />
        <Stat value={`${stats.showUpRate}%`} label="show-up rate" />
      </Card>
    )}

    <Card>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Skills & interests</Text>
      {profile.skills.length ? <View style={styles.chips}>
        {profile.skills.map(skill => <View key={skill} style={styles.chip}><Text style={styles.chipText}>{skill}</Text></View>)}
      </View> : <Text style={styles.muted}>{isSelf ? 'Add skills from Edit profile.' : 'No skills listed yet.'}</Text>}
    </Card>

    <Card>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{isSelf ? 'My posts' : 'Recent posts'}</Text>
      {posts.length === 0 ? <Text style={styles.muted}>No posts yet.</Text> : posts.map((post, i) =>
        <Pressable key={post.id} accessibilityRole="link" accessibilityLabel={`${post.type}: ${post.title}`}
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
          style={({ pressed }) => [styles.postRow, i > 0 && styles.postDivider, pressed && { opacity: 0.6 }]}>
          <View style={[styles.postIcon, { backgroundColor: post.type === 'Offer' ? theme.colors.successSurface : theme.colors.highlight }]}>
            <PostTypeIcon type={post.type} />
          </View>
          <View style={styles.postText}>
            <Text style={styles.postTitle} numberOfLines={2}>{post.title}</Text>
            <Text style={styles.muted}>Posted {timeAgo(post.created_at)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: post.type === 'Offer' ? theme.colors.primary : theme.colors.secondary }]}>
            <Text style={styles.badgeText}>{post.type}</Text>
          </View>
        </Pressable>)}
    </Card>

    {isSelf
      ? <Button label="Edit profile" onPress={() => router.push('/edit-profile')} />
      : onMessage && <Button label={`Message ${firstName}`} onPress={onMessage} loading={messageLoading} />}
    {footer}
  </>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  header: { backgroundColor: theme.colors.highlight, borderColor: '#F7C9CE', borderWidth: 1, borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.lg },
  headerText: { flex: 1, minWidth: 160, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  name: { fontFamily: theme.typography.bold, fontSize: 20, lineHeight: 24, color: theme.colors.text },
  subtitle: { ...theme.typography.caption, color: theme.colors.muted },
  bioRow: { width: '100%' },
  bio: { ...theme.typography.body, color: theme.colors.body },
  stats: { flexDirection: 'row', justifyContent: 'space-around', gap: theme.spacing.sm },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  statValue: { fontFamily: theme.typography.bold, fontSize: 16, lineHeight: 20, color: theme.colors.text },
  sectionTitle: { fontFamily: theme.typography.semibold, fontSize: 16, lineHeight: 22, color: theme.colors.text },
  muted: { ...theme.typography.caption, color: theme.colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: 6 },
  chipText: { ...theme.typography.body, color: theme.colors.text },
  postRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.dimensions.touchTarget, paddingVertical: theme.spacing.sm },
  postDivider: { borderTopWidth: 1, borderTopColor: theme.colors.border },
  postIcon: { width: 32, height: 32, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  postText: { flex: 1, gap: 2 },
  postTitle: { fontFamily: theme.typography.semibold, fontSize: 14, lineHeight: 20, color: theme.colors.text },
  badge: { borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: 4 },
  badgeText: { fontFamily: theme.typography.semibold, fontSize: 12, lineHeight: 16, color: theme.colors.text },
});
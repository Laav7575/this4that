import type { ReactNode } from 'react';
import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Card } from '../ui';
import { theme } from '../../constants/theme';
import type { PostRow } from '../../types/database';

const PREVIEW_LINES = 2;

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function PostCard({ post, name, footer }: { post: PostRow; name: string; footer?: ReactNode }) {
  const isOffer = post.type === 'Offer';
  const [descriptionOverflows, setDescriptionOverflows] = useState(false);

  return (
    <Card
      accessibilityLabel={`${post.completed_at ? 'Completed post. ' : ''}${name} is ${isOffer ? 'offering' : 'requesting'}: ${post.title}`}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Avatar name={name} />
        <View style={styles.cardWho}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">{name}</Text>
          <Text style={styles.meta} numberOfLines={2} ellipsizeMode="tail">{post.location} · {timeAgo(post.created_at)}</Text>
        </View>
        <View style={[styles.typeChip, isOffer ? styles.offerChip : styles.requestChip]}>
          <Text style={styles.typeChipText}>{post.completed_at ? 'Completed' : isOffer ? 'Offering' : 'Requesting'}</Text>
        </View>
      </View>
      <Text style={styles.postTitle} numberOfLines={2} ellipsizeMode="tail">{post.title}</Text>
      <View style={styles.descriptionPreview}>
        <Text style={styles.postBody} numberOfLines={PREVIEW_LINES} ellipsizeMode="tail">{post.description}</Text>
        {descriptionOverflows ? (
          <Text style={styles.seeMore} numberOfLines={1}>... Show more</Text>
        ) : null}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden={true}
          pointerEvents="none"
          style={styles.descriptionMeasure}
        >
          <Text
            accessible={false}
            onLayout={event => setDescriptionOverflows(event.nativeEvent.layout.height > theme.typography.body.lineHeight * PREVIEW_LINES)}
            style={styles.postBody}
          >
            {post.description}
          </Text>
        </View>
      </View>
      <View style={styles.tags}>
        <View style={styles.tag}><Text style={styles.tagText} numberOfLines={2} ellipsizeMode="tail">{post.category}</Text></View>
        <View style={styles.tag}><Text style={styles.tagText} numberOfLines={2} ellipsizeMode="tail">{post.availability}</Text></View>
      </View>
      {!post.completed_at && footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm, flexGrow: 1, minWidth: 0 },
  footer: { marginTop: 'auto' },
  cardHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.md },
  cardWho: { flex: 1, minWidth: 100 },
  name: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  meta: { ...theme.typography.caption, color: theme.colors.muted },
  typeChip: { flexShrink: 0, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  requestChip: { backgroundColor: theme.colors.secondary },
  offerChip: { backgroundColor: theme.colors.primary },
  typeChipText: { ...theme.typography.label, color: theme.colors.text },
  postTitle: { ...theme.typography.heading, color: theme.colors.text },
  postBody: { ...theme.typography.body, color: theme.colors.body },
  descriptionPreview: { position: 'relative' },
  descriptionMeasure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  seeMore: { ...theme.typography.caption, color: theme.colors.muted, backgroundColor: theme.colors.surface, position: 'absolute', right: 0, bottom: 0, paddingLeft: theme.spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  tag: { maxWidth: '100%', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs },
  tagText: { ...theme.typography.caption, color: theme.colors.body },
});

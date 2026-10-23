import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Avatar, Button } from '../ui';
import { HeaderIcon } from './Navigation';
import { MessageBubble } from './MessageBubble';
import { theme } from '../../constants/theme';
import { messageDay } from '../../services/messaging';
import type { MessageRow, PostRow, ProfileRow } from '../../types/database';

export function ChatView({ person, post, messages, userId, draft, onDraft, onSend, sending, error,
  onProfile, onPost, onOpenPost, onRefresh, hasOlder, loadingOlder, onOlder }: {
  person: ProfileRow | null; post: PostRow | null; messages: MessageRow[]; userId: string;
  draft: string; onDraft: (value: string) => void; onSend: () => void; sending: boolean; error: string;
  onProfile: () => void; onPost: () => void; onOpenPost: (postId: string) => void; onRefresh: () => void;
  hasOlder: boolean; loadingOlder: boolean; onOlder: () => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const nearBottom = useRef(true);
  const lastMessage = useRef<string | undefined>(undefined);
  const [menu, setMenu] = useState<'options' | 'suggestions' | null>(null);
  const latest = messages.at(-1);
  return <View style={styles.container}>
    <View style={styles.personRow}>
      <Pressable disabled={!person} accessibilityRole="button" accessibilityLabel={`View ${person?.name ?? 'student'} profile`}
        onPress={onProfile} style={styles.personLink}>
        <Avatar name={person?.name ?? 'Student'} uri={person?.avatar ?? undefined} />
        <View style={styles.personCopy}><Text numberOfLines={1} style={styles.name}>{person?.name ?? 'Student'}</Text>
          <Text style={styles.caption}>{person ? 'UW student · View profile' : 'Profile unavailable'}</Text></View>
      </Pressable>
      <HeaderIcon icon="more" label="Conversation options" onPress={() => setMenu('options')} />
    </View>
    {!!post && <Pressable accessibilityRole="button" accessibilityLabel={`View exchange: ${post.title}`} onPress={onPost} style={styles.context}>
      <Text style={styles.eyebrow}>ABOUT THIS EXCHANGE</Text>
      <Text numberOfLines={2} style={styles.contextTitle}>{post.title}</Text>
      <Text numberOfLines={2} style={styles.caption}>{post.availability} · {post.location}</Text>
    </Pressable>}
    <ScrollView ref={scroll} style={styles.thread} contentContainerStyle={styles.threadContent} keyboardShouldPersistTaps="handled"
      scrollEventThrottle={100} onScroll={event => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 90;
      }} onContentSizeChange={() => {
        if (lastMessage.current !== latest?.id && (nearBottom.current || latest?.sender_id === userId)) scroll.current?.scrollToEnd({ animated: !!lastMessage.current });
        lastMessage.current = latest?.id;
      }}>
      {hasOlder && <Button label="Load earlier messages" variant="secondary" loading={loadingOlder} onPress={onOlder} />}
      {!messages.length && <Text style={styles.empty}>Say hello! Arrange a time or suggest a service to exchange.</Text>}
      {messages.map((message, index) => <View key={message.id} style={styles.messageGroup}>
        {(index === 0 || messageDay(messages[index - 1].timestamp) !== messageDay(message.timestamp)) &&
          <Text style={styles.day}>{messageDay(message.timestamp).toUpperCase()}</Text>}
        <MessageBubble message={message} sent={message.sender_id === userId} onOpenPost={onOpenPost} />
      </View>)}
    </ScrollView>
    {!!error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
    <View style={styles.composerOuter}>
      <View style={styles.composer}>
        <Pressable accessibilityRole="button" accessibilityLabel="Message suggestions" onPress={() => setMenu('suggestions')} style={styles.add}>
          <Image source={require('../../assets/icons/messaging/add.svg')} style={{ width: 20, height: 20 }} contentFit="contain" />
        </Pressable>
        <TextInput multiline value={draft} onChangeText={onDraft} editable={!sending} maxLength={5000}
          placeholder="Write a message…" placeholderTextColor={theme.colors.muted} accessibilityLabel="Write a message"
          style={styles.input} textAlignVertical="center" />
        <Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
          disabled={!draft.trim() || sending} onPress={onSend} style={[styles.send, (!draft.trim() || sending) && styles.disabled]}>
          {sending ? <ActivityIndicator color={theme.colors.text} size="small" /> : <Text style={styles.sendText}>↑</Text>}
        </Pressable>
      </View>
      {draft.length > 4500 && <Text style={styles.counter}>{draft.length}/5000</Text>}
    </View>
    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => setMenu(null)}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close conversation menu" onPress={() => setMenu(null)} />
        <View accessibilityViewIsModal style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.modalTitle}>{menu === 'suggestions' ? 'Start with a suggestion' : 'Conversation options'}</Text>
          {menu === 'suggestions' ? ['When are you free to meet?', 'What would you like in exchange?', 'Could we meet on campus?'].map(suggestion =>
            <Button key={suggestion} variant="secondary" label={suggestion} disabled={sending}
              onPress={() => { onDraft(draft ? `${draft}\n${suggestion}`.slice(0, 5000) : suggestion); setMenu(null); }} />) : <>
            {!!person && <Button label="View profile" variant="secondary" onPress={() => { setMenu(null); onProfile(); }} />}
            <Button label="Refresh conversation" variant="secondary" onPress={() => { setMenu(null); onRefresh(); }} />
          </>}
          <Button label="Close" onPress={() => setMenu(null)} />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: theme.dimensions.contentMaxWidth, alignSelf: 'center', minHeight: 0 },
  personRow: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 24, gap: 4 },
  personLink: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0 }, personCopy: { flex: 1 },
  name: { fontFamily: theme.typography.semibold, fontSize: 18, lineHeight: 25, color: theme.colors.text },
  caption: { ...theme.typography.caption, color: theme.colors.muted },
  context: { marginHorizontal: 16, padding: 12, gap: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  eyebrow: { fontFamily: theme.typography.semibold, fontSize: 10, lineHeight: 14, color: theme.colors.muted },
  contextTitle: { ...theme.typography.body, fontFamily: theme.typography.semibold, color: theme.colors.text },
  thread: { flex: 1 }, threadContent: { padding: 16, paddingTop: 22, gap: 10 }, messageGroup: { gap: 16 },
  day: { fontFamily: theme.typography.medium, color: theme.colors.muted, fontSize: 10, lineHeight: 14, textAlign: 'center', paddingBottom: 4 },
  empty: { ...theme.typography.body, color: theme.colors.muted, textAlign: 'center', padding: 24 },
  composerOuter: { padding: 16, paddingTop: 8, paddingBottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 56, padding: 5,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  add: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  input: { ...theme.typography.body, fontSize: 13, flex: 1, minWidth: 0, minHeight: 44, maxHeight: 120, color: theme.colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  send: { width: 44, height: 44, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontFamily: theme.typography.semibold, fontSize: 24, color: theme.colors.text }, disabled: { opacity: 0.45 },
  counter: { ...theme.typography.caption, color: theme.colors.muted, textAlign: 'right', paddingTop: 4 },
  errorRow: { paddingHorizontal: 16, paddingVertical: 8 }, error: { ...theme.typography.caption, color: theme.colors.error },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(23,10,28,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.surface, padding: 24, borderRadius: 12, gap: 16 },
  modalTitle: { ...theme.typography.heading, color: theme.colors.text },
});

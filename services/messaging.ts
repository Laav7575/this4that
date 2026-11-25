import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO, DEMO_USER_ID } from '../lib/demo';
import { getSupabase } from '../lib/supabase';
import * as demo from './demoBackend';
import { createConversation, getConversations, getLatestIncomingMessage, getMessages, getParticipants, getPost, getProfile } from './backend';
import type { ConversationRow, MessageRow, PostRow, ProfileRow } from '../types/database';

export type InboxItem = { conversation: ConversationRow; person: ProfileRow | null; latest?: MessageRow; unread: boolean };
export async function messagingUser() {
  if (DEMO) return DEMO_USER_ID;
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Sign in to see your messages.');
  return data.session.user.id;
}
const readKey = (userId: string, id: string) => `messages:read:${userId}:${id}`;
// Read receipts are device-local until the backend supports them.
export async function markConversationRead(userId: string, id: string, timestamp: string) {
  const key = readKey(userId, id);
  const previous = await AsyncStorage.getItem(key);
  if (!previous || !Number.isFinite(Date.parse(previous)) || Date.parse(timestamp) > Date.parse(previous)) {
    await AsyncStorage.setItem(key, timestamp);
  }
}
export async function loadInbox(userId: string, offset: number, limit = 20): Promise<InboxItem[]> {
  const conversations = await getConversations(offset, limit);
  return Promise.all(conversations.map(async conversation => {
    const [participants, history, latestIncoming, readAt] = await Promise.all([
      getParticipants(conversation.id), getMessages(conversation.id, 0, 1),
      getLatestIncomingMessage(conversation.id, userId), AsyncStorage.getItem(readKey(userId, conversation.id)),
    ]);
    const other = participants.find(p => p.user_id !== userId);
    const person = other ? await getProfile(other.user_id) : null;
    const latest = history[0];
    const readTimestamp = readAt ? Date.parse(readAt) : NaN;
    return {
      conversation, person, latest,
      unread: !!latestIncoming && (!Number.isFinite(readTimestamp) || Date.parse(latestIncoming.timestamp) > readTimestamp),
    };
  }));
}
export async function getMessageEmailNotifications(userId: string) {
  if (DEMO) return false;
  const { data, error } = await getSupabase().from('message_notification_preferences')
    .select('email_enabled').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.email_enabled ?? true;
}
export async function setMessageEmailNotifications(userId: string, enabled: boolean) {
  if (DEMO) throw new Error('Email notifications are unavailable in demo mode.');
  const { error } = await getSupabase().from('message_notification_preferences')
    .upsert({ user_id: userId, email_enabled: enabled }, { onConflict: 'user_id' });
  if (error) throw error;
}
export async function notifyMessageRecipient(messageId: string) {
  if (DEMO) return;
  const { error } = await getSupabase().functions.invoke('notify-message', { body: { messageId } });
  if (error) throw new Error('Message was sent, but its email notification could not be delivered.');
}
export async function loadChatDetails(id: string, userId: string): Promise<{ person: ProfileRow | null; post: PostRow | null; conversation: ConversationRow }> {
  const { data: conversation, error } = DEMO ? { data: await demo.getConversation(id), error: null }
    : await getSupabase().from('conversations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!conversation) throw new Error('This conversation is unavailable or you no longer have access.');
  const participants = await getParticipants(id);
  const other = participants.find(p => p.user_id !== userId);
  const [person, post] = await Promise.all([
    other ? getProfile(other.user_id) : Promise.resolve(null),
    conversation.related_post_id ? getPost(conversation.related_post_id) : Promise.resolve(null),
  ]);
  return { person, post, conversation };
}
export function mergeMessages(existing: MessageRow[], incoming: MessageRow[]) {
  return [...new Map([...existing, ...incoming].map(m => [m.id, m])).values()]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
}
export function messageTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
export function messageDay(timestamp: string) {
  const d = new Date(timestamp);
  return d.toDateString() === new Date().toDateString() ? 'Today' : d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}
export function inboxTime(timestamp: string) {
  const d = new Date(timestamp);
  return d.toDateString() === new Date().toDateString() ? messageTime(timestamp) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Keyset paging avoids skipping history when a new message arrives between requests. */
export async function getEarlierMessages(id: string, before: MessageRow) {
  if (DEMO) return demo.getMessagesBefore(id, before);
  // Both values come from database rows; normalize the date before placing it in the filter.
  const timestamp = new Date(before.timestamp).toISOString();
  if (!/^[0-9a-f-]+$/i.test(before.id)) throw new Error('Invalid message cursor.');
  const { data, error } = await getSupabase().from('messages').select('*').eq('conversation_id', id)
    .or(`timestamp.lt.${timestamp},and(timestamp.eq.${timestamp},id.lt.${before.id})`)
    .order('timestamp', { ascending: false }).order('id', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}

/** The database atomically reuses one conversation per pair, regardless of the post. */
export async function openConversation(otherUserId: string, postId?: string) {
  return createConversation(otherUserId, postId);
}

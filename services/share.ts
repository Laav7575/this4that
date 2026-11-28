import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { getConversations, getParticipants, getProfile, sendMessage } from './backend';
import { messagingUser, notifyMessageRecipient } from './messaging';
import type { ProfileRow } from '../types/database';

/** Matches the post id in a shared link, so chat can offer an "Open post" button. */
export const POST_LINK_PATTERN = /\/post\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function postLink(postId: string) {
  const web = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : '';
  const base = (process.env.EXPO_PUBLIC_WEB_URL || web).replace(/\/+$/, '');
  return base ? `${base}/post/${postId}` : Linking.createURL(`/post/${postId}`);
}

export async function copyPostLink(postId: string) {
  await Clipboard.setStringAsync(postLink(postId));
}

export type ShareTarget = { conversationId: string; person: ProfileRow | null };

/** The signed-in user's most recent open conversations, with the other person's profile. */
export async function loadShareTargets(): Promise<ShareTarget[]> {
  const userId = await messagingUser();
  const open = (await getConversations(0, 30)).filter(conversation => !conversation.closed_at);
  return Promise.all(open.map(async conversation => {
    const participants = await getParticipants(conversation.id);
    const other = participants.find(p => p.user_id !== userId);
    return { conversationId: conversation.id, person: other ? await getProfile(other.user_id) : null };
  }));
}

export async function sendPostToConversation(conversationId: string, post: { id: string; title: string }) {
  const message = await sendMessage(conversationId, `Check out this post: ${post.title}\n${postLink(post.id)}`);
  // The message is already sent; a failed email notification should not turn this into an error.
  try { await notifyMessageRecipient(message.id); } catch {}
  return message;
}

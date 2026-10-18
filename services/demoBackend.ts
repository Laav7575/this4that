/** In-memory stand-in for services/backend.ts, used only when DEMO is on (see lib/demo.ts). */
import { DEMO_USER_ID } from '../lib/demo';
import type { ConversationRow, MessageRow, ParticipantRow, PostInput, PostRow, ProfileInput, ProfileRow } from '../types/database';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const profiles: ProfileRow[] = [
  { id: DEMO_USER_ID, name: 'Alex Kim', program: 'Arts', location: 'Uptown Waterloo', bio: 'Demo account.', avatar: null, skills: ['Moving', 'Baking'], created_at: '2025-09-01T00:00:00.000Z' },
  { id: 'maya', name: 'Maya Chen', program: 'Mathematics', location: 'Uptown Waterloo', bio: 'Happy to trade calculus help for practical favours.', avatar: null, skills: ['Calculus', 'Meal prep'], created_at: '2024-09-01T00:00:00.000Z' },
  { id: 'jordan', name: 'Jordan Patel', program: 'Computer Science', location: '', bio: 'Python enthusiast and weekend cyclist.', avatar: null, skills: ['Python', 'Technology support'], created_at: '2025-01-15T00:00:00.000Z' },
  { id: 'aisha', name: 'Aisha Rahman', program: 'Engineering', location: '', bio: 'I enjoy helping neighbours and looking after pets.', avatar: null, skills: ['Pet sitting', 'Moving'], created_at: '2024-09-01T00:00:00.000Z' },
];
const posts: PostRow[] = [
  { id: 'calculus', author_id: 'maya', title: 'Calculus tutoring', description: 'Review limits and derivatives together at Dana Porter.', category: 'Tutoring', type: 'Offer', availability: 'Weekday afternoons', location: 'Dana Porter Library', created_at: minutesAgo(40) },
  { id: 'python', author_id: 'jordan', title: 'Python programming help', description: 'Help debugging your first Python project.', category: 'Technology', type: 'Offer', availability: 'Tuesday evening', location: 'DC Library', created_at: minutesAgo(95) },
  { id: 'groceries', author_id: 'maya', title: 'Grocery pickup', description: 'Could someone pick up a few essentials on their way home?', category: 'Errands', type: 'Request', availability: 'Sunday afternoon', location: 'Uptown Waterloo', created_at: minutesAgo(180) },
  { id: 'moving', author_id: 'jordan', title: 'Moving assistance', description: 'Need an extra pair of hands to carry a small desk.', category: 'Moving', type: 'Request', availability: 'Saturday at 2 PM', location: 'University Avenue', created_at: minutesAgo(300) },
  { id: 'pets', author_id: 'aisha', title: 'Pet sitting', description: 'Happy to watch your cat while you visit home.', category: 'Pets', type: 'Offer', availability: 'Weekends', location: 'Lakeshore', created_at: minutesAgo(600) },
  { id: 'tech', author_id: 'aisha', title: 'Technology support', description: 'Looking for help setting up my laptop backup.', category: 'Technology', type: 'Request', availability: 'Monday evening', location: 'SLC', created_at: minutesAgo(1500) },
];
const conversations: ConversationRow[] = [
  { id: 'moving-chat', related_post_id: 'moving', created_at: minutesAgo(120) },
  { id: 'pets-chat', related_post_id: 'pets', created_at: minutesAgo(1440) },
];
const participants: ParticipantRow[] = [
  { conversation_id: 'moving-chat', user_id: DEMO_USER_ID }, { conversation_id: 'moving-chat', user_id: 'jordan' },
  { conversation_id: 'pets-chat', user_id: DEMO_USER_ID }, { conversation_id: 'pets-chat', user_id: 'aisha' },
];
const messages: MessageRow[] = [
  { id: 'm1', conversation_id: 'moving-chat', sender_id: DEMO_USER_ID, content: 'Hi Jordan! I can help carry the desk on Saturday.', timestamp: minutesAgo(110) },
  { id: 'm2', conversation_id: 'moving-chat', sender_id: 'jordan', content: 'Amazing, thank you! Could I help you with anything in exchange?', timestamp: minutesAgo(100) },
  { id: 'm3', conversation_id: 'moving-chat', sender_id: 'jordan', content: 'Saturday at 2 works. Could we meet at Dana Porter?', timestamp: minutesAgo(15) },
  { id: 'm4', conversation_id: 'pets-chat', sender_id: 'aisha', content: 'Are you still looking for someone to watch your cat?', timestamp: minutesAgo(1430) },
  { id: 'm5', conversation_id: 'pets-chat', sender_id: DEMO_USER_ID, content: 'Yes please! Thanks again, you’re a lifesaver.', timestamp: minutesAgo(1400) },
];

const newestFirst = (a: { timestamp: string; id: string }, b: { timestamp: string; id: string }) =>
  b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id);

export async function getProfile(id: string) { return profiles.find(p => p.id === id) ?? null; }
export async function getProfiles(ids: string[]) { return profiles.filter(profile => ids.includes(profile.id)); }
export async function getPostCategories() { return Array.from(new Set(posts.map(post => post.category))).sort((a, b) => a.localeCompare(b)); }
export async function getPostsByAuthor(authorId: string, limit = 20) {
  return posts.filter(post => post.author_id === authorId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    .slice(0, limit);
}
export async function createMyProfile(input: ProfileInput) {
  if (profiles.some(profile => profile.id === DEMO_USER_ID)) {
    throw new Error('The demo profile already exists.');
  }
  const profile: ProfileRow = {
    id: DEMO_USER_ID,
    name: input.name,
    program: input.program ?? '',
    location: input.location ?? '',
    bio: input.bio ?? '',
    avatar: input.avatar ?? null,
    skills: input.skills ?? [],
    created_at: new Date().toISOString(),
  };
  profiles.push(profile);
  return profile;
}
export async function updateMyProfile(input: Partial<ProfileInput>) {
  const profile = profiles.find(item => item.id === DEMO_USER_ID);
  if (!profile) throw new Error('The demo profile has not been created.');
  Object.assign(profile, input);
  return profile;
}
export async function getPosts({ offset = 0, limit = 20, category, type, search }: { offset?: number; limit?: number; category?: string; type?: PostInput['type']; search?: string } = {}) {
  const terms = search?.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean) ?? [];
  return posts.filter(p => (!category || p.category === category) && (!type || p.type === type))
    .filter(p => terms.every(term => [p.title, p.description, p.category, p.location].some(value => value.toLocaleLowerCase().includes(term))))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(offset, offset + limit);
}
export async function getPost(id: string) { return posts.find(p => p.id === id) ?? null; }
export async function createPost(input: PostInput) {
  const post: PostRow = { ...input, id: newId('post'), author_id: DEMO_USER_ID, created_at: new Date().toISOString() };
  posts.unshift(post);
  return post;
}
export async function getConversation(id: string) { return conversations.find(c => c.id === id) ?? null; }
export async function getConversations(offset = 0, limit = 20) {
  return conversations.filter(c => participants.some(p => p.conversation_id === c.id && p.user_id === DEMO_USER_ID))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(offset, offset + limit);
}
export async function getParticipants(conversationId: string) { return participants.filter(p => p.conversation_id === conversationId); }
export async function findConversation(otherUserId: string, postId?: string) {
  return conversations.find(c => (c.related_post_id ?? undefined) === postId
    && participants.some(p => p.conversation_id === c.id && p.user_id === otherUserId))?.id;
}
export async function createConversation(otherUserId: string, postId?: string) {
  const id = newId('chat');
  conversations.push({ id, related_post_id: postId ?? null, created_at: new Date().toISOString() });
  participants.push({ conversation_id: id, user_id: DEMO_USER_ID }, { conversation_id: id, user_id: otherUserId });
  return id;
}
export async function getMessages(conversationId: string, offset = 0, limit = 50) {
  return messages.filter(m => m.conversation_id === conversationId).sort(newestFirst).slice(offset, offset + limit);
}
export async function getMessagesBefore(conversationId: string, before: MessageRow, limit = 50) {
  return messages.filter(m => m.conversation_id === conversationId && newestFirst(m, before) > 0).sort(newestFirst).slice(0, limit);
}
export async function sendMessage(conversationId: string, content: string) {
  const message: MessageRow = { id: newId('msg'), conversation_id: conversationId, sender_id: DEMO_USER_ID, content, timestamp: new Date().toISOString() };
  messages.push(message);
  return message;
}

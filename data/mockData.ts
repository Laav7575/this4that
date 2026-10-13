import type { Conversation, Message, Post, User } from '../types';
export const users: User[] = [
  { id: 'maya', name: 'Maya Chen', email: 'maya@uwaterloo.ca', program: 'Mathematics', bio: 'Happy to trade calculus help for practical favours.', uwVerified: true, skills: ['Calculus', 'Meal prep'] },
  { id: 'jordan', name: 'Jordan Patel', email: 'jordan@uwaterloo.ca', program: 'Computer Science', bio: 'Python enthusiast and weekend cyclist.', uwVerified: true, skills: ['Python', 'Technology support'] },
  { id: 'aisha', name: 'Aisha Rahman', email: 'aisha@uwaterloo.ca', program: 'Engineering', bio: 'I enjoy helping neighbours and looking after pets.', uwVerified: false, skills: ['Pet sitting', 'Moving'] },
];
export const currentUser = users[0];
export const posts: Post[] = [
  { id: 'calculus', authorId: 'maya', title: 'Calculus tutoring', description: 'Review limits and derivatives together at Dana Porter.', category: 'Tutoring', type: 'Offer', availability: 'Weekday afternoons', location: 'Dana Porter Library', createdAt: '2026-10-10T14:00:00Z' },
  { id: 'python', authorId: 'jordan', title: 'Python programming help', description: 'Help debugging your first Python project.', category: 'Technology', type: 'Offer', availability: 'Tuesday evening', location: 'DC Library', createdAt: '2026-10-10T15:00:00Z' },
  { id: 'groceries', authorId: 'maya', title: 'Grocery pickup', description: 'Could someone pick up a few essentials on their way home?', category: 'Errands', type: 'Request', availability: 'Sunday afternoon', location: 'Uptown Waterloo', createdAt: '2026-10-10T16:00:00Z' },
  { id: 'moving', authorId: 'jordan', title: 'Moving assistance', description: 'Need an extra pair of hands to carry a small desk.', category: 'Moving', type: 'Request', availability: 'Saturday at 2 PM', location: 'University Avenue', createdAt: '2026-10-10T17:00:00Z' },
  { id: 'pets', authorId: 'aisha', title: 'Pet sitting', description: 'Happy to watch your cat while you visit home.', category: 'Pets', type: 'Offer', availability: 'Weekends', location: 'Lakeshore', createdAt: '2026-10-10T18:00:00Z' },
  { id: 'tech', authorId: 'aisha', title: 'Technology support', description: 'Looking for help setting up my laptop backup.', category: 'Technology', type: 'Request', availability: 'Monday evening', location: 'SLC', createdAt: '2026-10-10T19:00:00Z' },
];
export const messages: Message[] = [
  { id: 'message-1', conversationId: 'moving-chat', senderId: 'maya', content: 'I can help with the desk on Saturday.', timestamp: '2026-10-10T20:00:00Z' },
  { id: 'message-2', conversationId: 'moving-chat', senderId: 'jordan', content: 'Thanks! Saturday at 2 works.', timestamp: '2026-10-10T20:05:00Z' },
  { id: 'message-3', conversationId: 'pets-chat', senderId: 'maya', content: 'Are you available to watch my cat next weekend?', timestamp: '2026-10-10T21:00:00Z' },
];
export const conversations: Conversation[] = [
  { id: 'moving-chat', participantIds: ['maya', 'jordan'], relatedPostId: 'moving', lastMessageId: 'message-2' },
  { id: 'pets-chat', participantIds: ['maya', 'aisha'], relatedPostId: 'pets', lastMessageId: 'message-3' },
];

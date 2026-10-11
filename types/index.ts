export interface User {
  id: string; name: string; email: string; program: string; bio: string; avatar?: string;
  uwVerified: boolean; skills: string[];
}
export type PostType = 'Offer' | 'Request';
export interface Post {
  id: string; authorId: User['id']; title: string; description: string; category: string;
  type: PostType; availability: string; location: string; createdAt: string;
}
export interface Message {
  id: string; conversationId: string; senderId: User['id']; content: string; timestamp: string;
}
export interface Conversation {
  id: string; participantIds: User['id'][]; relatedPostId?: Post['id']; lastMessageId?: Message['id'];
}

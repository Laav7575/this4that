/** Migration-aligned types. Regenerate from Supabase after deployment; do not confuse these with mock IDs. */
export type ProfileRow = { id: string; name: string; program: string; bio: string; avatar: string | null; skills: string[] }
export type PostRow = { id: string; author_id: string; title: string; description: string; category: string; type: 'Offer' | 'Request'; availability: string; location: string; created_at: string; search_document?: string }
export type ConversationRow = { id: string; related_post_id: string | null; created_at: string }
export type ParticipantRow = { conversation_id: string; user_id: string }
export type MessageRow = { id: string; conversation_id: string; sender_id: string; content: string; timestamp: string }
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export type ProfileInput = Pick<ProfileRow, 'name'> & Partial<Omit<ProfileRow, 'id' | 'name'>>;
export type PostInput = Omit<PostRow, 'id' | 'author_id' | 'created_at' | 'search_document'>;
export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, ProfileInput & { id: string }, Partial<ProfileInput>>;
      posts: Table<PostRow, PostInput & { author_id: string }, Partial<PostInput>>;
      conversations: Table<ConversationRow, never, never>;
      conversation_participants: Table<ParticipantRow, never, never>;
      messages: Table<MessageRow, Pick<MessageRow, 'conversation_id' | 'sender_id' | 'content'>, never>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_conversation: { Args: { other_user_id: string; post_id?: string }; Returns: string };
      get_post_categories: { Args: Record<PropertyKey, never>; Returns: { category: string }[] };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

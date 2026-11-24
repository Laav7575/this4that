/** Migration-aligned types. Regenerate from Supabase after deployment; do not confuse these with mock IDs. */
export type ProfileRow = { id: string; name: string; program: string; location: string; bio: string; avatar: string | null; skills: string[]; created_at?: string }
export type PostRow = { id: string; author_id: string; title: string; description: string; category: string; type: 'Offer' | 'Request'; availability: string; location: string; created_at: string; search_document?: string; completed_at?: string | null }
export type ConversationRow = { id: string; related_post_id: string | null; created_at: string; closed_at?: string | null }
export type ParticipantRow = { conversation_id: string; user_id: string }
export type MessageRow = { id: string; conversation_id: string; sender_id: string; content: string; timestamp: string;
  /** Set on exchange notices: the post this part of the conversation is about. */
  post_id?: string | null }
type TermsAcceptanceRow = { user_id: string; terms_version: string; accepted_at: string };
type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export type ProfileInput = Pick<ProfileRow, 'name'> & Partial<Omit<ProfileRow, 'id' | 'name' | 'created_at'>>;
export type PostInput = Omit<PostRow, 'id' | 'author_id' | 'created_at' | 'search_document' | 'completed_at'>;
export interface Database {
  public: {
    Tables: {
      terms_acceptances: Table<TermsAcceptanceRow, Pick<TermsAcceptanceRow, 'user_id' | 'terms_version'>, never>;
      profiles: Table<ProfileRow, ProfileInput & { id: string }, Partial<ProfileInput>>;
      posts: Table<PostRow, PostInput & { author_id: string }, Partial<PostInput>>;
      conversations: Table<ConversationRow, never, never>;
      conversation_participants: Table<ParticipantRow, never, never>;
      messages: Table<MessageRow, Pick<MessageRow, 'conversation_id' | 'sender_id' | 'content'>, never>;
    };
    Views: { [_ in never]: never };
    Functions: {
      set_post_completed: { Args: { target_id: string; completed: boolean }; Returns: PostRow };
      set_conversation_closed: { Args: { target_id: string; closed: boolean }; Returns: ConversationRow };
      create_conversation: { Args: { other_user_id: string; post_id?: string }; Returns: string };
      get_post_categories: { Args: Record<PropertyKey, never>; Returns: { category: string }[] };
      search_posts: {
        Args: {
          p_include_completed?: boolean;
          p_offset: number;
          p_limit: number;
          p_category: string | null;
          p_type: string | null;
          p_search: string | null;
          p_location: string | null;
          p_created_after: string | null;
        };
        Returns: PostRow[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

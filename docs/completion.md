# MP3 completion and closure

## Product rules

- A post owner can mark a post completed (fulfilled) and reopen it from post details or the linked post in a conversation. This is an owner declaration, not a mutually verified exchange or a rating.
- Completion stays visible on post details, feed cards, profile posts, and the related post card in chat. Completed listings no longer show their Message action; existing conversations remain available.
- Either participant can close or reopen the shared conversation, with confirmation. Closure pauses sending for both participants, keeps history, and does not complete any posts. Opening the same person from another post reuses the same conversation and does not silently reopen it.
- The inbox has Active/Closed filters and status labels. Chat and inbox refresh through their existing 10/15-second polling and focus refresh; post details, feed, and profile refresh on focus.
- Draft text survives closing and reopening while the chat screen stays mounted. Drafts are not persisted across navigation or reload.
- There is no mutual confirmation or dispute adjudication in this iteration. Either participant can reopen a closed conversation to continue discussing an issue; only the post owner can change completion.

## Deployment

Apply `supabase/migrations/202611180003_completion_states.sql` after the existing migrations, including `202610230001_conversation_latest_post.sql`, before using these controls against hosted Supabase. It adds nullable timestamps (existing rows remain active), owner/participant-authorized RPCs, and a trigger that rejects user messages to a closed chat. It does not delete history. The migration has only been tested locally, not applied to hosted Supabase.

Demo mode implements the same states in memory. Use My Profile → Baking help for a study break to test your own post, Messages → Maya to complete your own post directly in chat, and Messages → Jordan to test chat closure. Reloading resets demo data.

## Validation

`npm run typecheck` and `npm run test:backend`. Backend tests use PostgreSQL through PGlite to verify ownership, participant isolation, direct-write denial, anonymous/unconfirmed access denial, independent statuses, idempotent completion, history preservation, closed-chat send rejection, and reopening. Chrome demo checks cover completing/reopening a post, closing/reopening a chat with a draft, and filtering the closed conversation in the inbox. Native simulator testing remains outstanding.

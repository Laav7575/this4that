# Supabase Free: first connection

Backend work is on `feat/supabase-backend`, separate from the foundation PR. The mock screens still run without backend configuration. A hosted development project responds to the configured public key. Tables have not been deployed by this code; authentication screens remain placeholders.

## 1. Create the development project

1. Visit https://supabase.com/dashboard and sign in.
2. Create an organization on the Free plan.
3. Create a project named `this4that-dev`.
4. Generate a database password and save it in your password manager. Do not put it in the Expo app.
5. Select a region near your expected Canadian users and wait for provisioning.
6. Open Connect and copy the Project URL and publishable key (`sb_publishable_...`).

## 2. Configure this checkout

```sh
cp .env.example .env
```

Fill the two values in `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Restart Expo after editing environment values:

```sh
npx expo start --clear
```

`.env` is ignored by Git. EXPO_PUBLIC values are embedded in the client application, so never use a database password, secret key, or service-role key. Database access must be enforced with row-level security.

`lib/supabase.ts` exports `getSupabase()` for feature services. It initializes on first use and fails clearly if configuration is absent. Native sessions use AsyncStorage; web sessions use the SDK's browser storage. Auth URL detection is disabled; confirmation, recovery, and OAuth callbacks must be implemented explicitly when adding real authentication.

When authentication is wired into the root layout, call `manageSupabaseSessionRefresh()` inside a React effect and return its cleanup. Do not call it independently in every screen. Session refresh is not mounted in the mock app yet.

## 3. Next implementation step

The versioned migration below prepares profiles, posts, conversations, participants, messages, and row-level security with a confirmed Waterloo identity check. Apply it only to the development project first. Keep private email addresses out of publicly readable profile rows.

Then implement sign-in/sign-up, confirmed-email checks, session-based routing, and shared data services. The current mock continue button does not authenticate or grant database access. Do not disable RLS to make mock screens work.

Before testing signup with classmates, configure email delivery. Supabase's default email sender restricts recipients to organization members and has low sending limits; custom SMTP is needed for general signup testing. Keep email confirmation enabled. Storage and realtime messaging come after database access rules and two-account isolation tests.

## Validation

Local compilation and bundling can be checked before credentials exist. A live Auth/database connection cannot be verified until a hosted project and its configuration are available. No database operations or emails have been sent by this setup.

Sources: https://supabase.com/docs/guides/auth/quickstarts/react-native and https://supabase.com/docs/guides/auth/auth-smtp

## Ready-to-connect APIs

The schema is now in `supabase/migrations/202610120001_backend.sql`. The app still imports `data/mockData.ts`; it does not make backend calls. No fixtures are inserted into the hosted database. Mock IDs such as `maya` are not backend UUIDs and cannot be passed to live APIs.

To deploy to the development project:

1. In the Supabase dashboard, confirm you are in `this4that-dev` (project ref `hnjhweyekaobzhnztyzt`).
2. Open SQL Editor → New query.
3. Paste the entire migration file and run it once. It is transactional and designed for an empty project, not to overwrite existing tables.
4. Confirm Table Editor contains profiles, posts, conversations, conversation_participants, and messages with RLS enabled.
5. Keep email confirmation enabled. All data access requires an Auth email ending exactly in `@uwaterloo.ca` and a nonnull confirmation timestamp. Other users may exist in Auth, but cannot access app data. A Before User Created hook to reject other domains at registration is not yet deployed.

Do not put database admin credentials in this repository or Expo environment. The publishable key cannot run migrations. For future CLI-based deployment, use Supabase CLI login/link and `db push`, tracking applied migrations. If this first migration is applied manually through SQL Editor, reconcile CLI migration history before a later db push to avoid attempting to recreate the tables.

### Team API contract

Import functions directly from `services/backend.ts` when your feature is ready to use real data:

| Feature | Functions |
| --- | --- |
| Profile | getProfile, createMyProfile, updateMyProfile |
| Posts/Search | getPosts, getPost, createPost, updatePost, deletePost |
| Messaging | createConversation, getConversations, getParticipants, getMessages, sendMessage |
| Authentication (`services/auth.ts`) | signUp, signIn, signOut |

No feature automatically switches to backend mode when `.env` is present. Keep mocks until real auth and feature UI are ready. Use a deliberate screen/service import change when connecting a feature.

Backend DTOs in `types/database.ts` use database snake_case and UUIDs; the foundation models use camelCase and mock IDs. Return types are inferred from the typed Supabase client. Public profiles intentionally omit email and verification flags; obtain your own email/confirmation state through Auth. Do not cast backend profiles to the foundation User type. Generate authoritative database types after deployment using `supabase gen types typescript --linked` and reconcile these DTOs against the migration.

Mutations derive owner/sender IDs from Auth. Profile updates cannot alter identity. Post updates cannot alter ownership or creation timestamps. Message history is newest first. List functions have bounded offset pagination (1–100 records); stable secondary IDs resolve timestamp ties, but new records can shift offsets. There is no advanced text search yet; category/type filters are available.

Create your own profile after signing in, then posts. Conversations use an atomic RPC for two participants; a related post must belong to one participant. Calling it repeatedly creates separate conversations. No client can directly change membership. Last-message summaries are not stored; the Messages developer can use message queries. Realtime subscriptions, attachments/storage, account deletion, and password recovery/OAuth callbacks are future additions.

### Backend validation

```sh
npm run test:backend
npm run typecheck
npm run lint
npm run build:web
```

`test:backend` executes the actual SQL in embedded PostgreSQL (PGlite) with a minimal Supabase Auth role fixture. It tests owner edits, spoofed IDs, unconfirmed/non-Waterloo access, participant-only messages, unauthorized membership changes, and anonymous denial. This is not a hosted Supabase integration test or a production security audit. After deployment, repeat isolation checks with two confirmed development users and a third unrelated user. Do not use the service-role key for those tests because it bypasses RLS.

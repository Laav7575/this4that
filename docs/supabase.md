# Supabase Free: first connection

Backend work is on `feat/supabase-backend`, separate from the foundation PR. The mock screens still run without backend configuration. A hosted development project responds to the configured public key. The schema and development seed were applied manually to the hosted project. Real authentication/session integration remains separate from the feature UI.

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

For local UI review without signing in, set `EXPO_PUBLIC_DEMO_MODE=1` in `.env` and restart Expo with `npx expo start --clear`. Demo mode bypasses the login screen and uses in-memory sample data for profile viewing and editing; changes are lost when the app reloads. Never enable it in a production build.

`lib/supabase.ts` exports `getSupabase()` for feature services. It initializes on first use and fails clearly if configuration is absent. Native sessions use AsyncStorage; web sessions use the SDK's browser storage. Auth URL detection is disabled; confirmation, recovery, and OAuth callbacks must be implemented explicitly when adding real authentication.

When authentication is wired into the root layout, call `manageSupabaseSessionRefresh()` inside a React effect and return its cleanup. Do not call it independently in every screen. Session refresh is not mounted in the mock app yet.

## 3. Next implementation step

The versioned migration below prepares profiles, posts, conversations, participants, messages, and row-level security with a confirmed Waterloo identity check. Apply it only to the development project first. Keep private email addresses out of publicly readable profile rows.

Then implement sign-in/sign-up, confirmed-email checks, session-based routing, and shared data services. The current mock continue button does not authenticate or grant database access. Do not disable RLS to make mock screens work.

Before testing signup with classmates, configure email delivery. Supabase's default email sender restricts recipients to organization members and has low sending limits; custom SMTP is needed for general signup testing. Keep email confirmation enabled. Storage and realtime messaging come after database access rules and two-account isolation tests.

## Validation

Local compilation and bundling can be checked before credentials exist. Public Auth configuration responds successfully. The user verified hosted seed counts (3 profiles, 6 posts, 2 conversations, 4 memberships, 3 messages). Authenticated hosted API isolation tests remain outstanding.

Sources: https://supabase.com/docs/guides/auth/quickstarts/react-native and https://supabase.com/docs/guides/auth/auth-smtp

## Ready-to-connect APIs

The base schema is in `supabase/migrations/202610120001_backend.sql`; Search uses the backend post APIs when Supabase mode is enabled. Apply `supabase/migrations/202610180001_post_search.sql` after the base schema to add indexed full-text search, category/type feed indexes, and the category-list RPC. Apply `supabase/migrations/202610180002_location_search.sql` next to add indexed location filtering. Mock IDs such as `maya` are not backend UUIDs and cannot be passed to live APIs.

To deploy to the development project:

1. In the Supabase dashboard, confirm you are in `this4that-dev` (project ref `hnjhweyekaobzhnztyzt`).
2. Open SQL Editor → New query.
3. Paste the entire migration file and run it once. It is transactional and designed for an empty project, not to overwrite existing tables.
4. After the base migration is applied, run the post-search migration once in a new SQL Editor query.
5. Run the location-search migration once in a new SQL Editor query.
6. Confirm Table Editor contains profiles, posts, conversations, conversation_participants, and messages with RLS enabled.
7. Keep email confirmation enabled. All data access requires an Auth email ending exactly in `@uwaterloo.ca` and a nonnull confirmation timestamp. Other users may exist in Auth, but cannot access app data. A Before User Created hook to reject other domains at registration is not yet deployed.

Do not put database admin credentials in this repository or Expo environment. The publishable key cannot run migrations. For future CLI-based deployment, use Supabase CLI login/link and `db push`, tracking applied migrations. If this first migration is applied manually through SQL Editor, reconcile CLI migration history before a later db push to avoid attempting to recreate the tables.

### Team API contract

Import functions directly from `services/backend.ts` when your feature is ready to use real data:

| Feature | Functions |
| --- | --- |
| Profile | getProfile, createMyProfile, updateMyProfile |
| Posts/Search | getPosts, getPost, getPostCategories, getProfiles, createPost, updatePost, deletePost |
| Messaging | createConversation, getConversations, getParticipants, getMessages, sendMessage |
| Authentication (`services/auth.ts`) | signUp, signIn, signOut |

`getPosts` applies keyword, location, category, type, and date filters in Supabase before paging results. Keyword and location search use generated English full-text documents and GIN indexes; category and type filters have feed-ordering indexes. Search input is debounced in the UI, and result author profiles are loaded in one batch.

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

## Development sample data

Run `supabase/seeds/development.sql` manually in the **this4that-dev** SQL Editor after applying the schema. This is a development fixture, separate from schema migrations and never intended for production. It maps A to Maya, B to Jordan, and C to Aisha using the supplied Auth UUIDs. These names are fictional display data; Auth emails and passwords are not copied or changed.

The script first checks that all three Auth accounts exist and have confirmed exact `@uwaterloo.ca` emails. It does not auto-confirm users or weaken RLS. It inserts 3 profiles, 6 posts, 2 conversations, 4 memberships, and 3 messages in one transaction. Existing profiles/fixture rows are preserved with `ON CONFLICT DO NOTHING`; reruns do not duplicate data or reset developer edits. If a supplied account already has a profile, that profile's current display name remains.

Run as the SQL Editor's database administrator, not from the app. The seed deliberately inserts complete fixture relationships through admin access; normal clients must use the guarded conversation RPC. Tables must already exist. Do not rerun the original schema migration. The application continues using `data/mockData.ts` until a feature explicitly opts into the real APIs.

Validate locally with `npm run test:seed`. After running on Supabase, check the five tables in Table Editor. Repeat permission checks using normal authenticated client accounts; SQL Editor's postgres role bypasses RLS and does not prove app-user isolation.


## Team handoff

After this PR merges, pull main, run npm ci, copy .env.example to .env, and fill the project URL and publishable key provided by the project owner. Restart Expo. These public configuration values allow API connectivity, not unrestricted database access. Never use a service-role/secret key or database password in Expo.

Use your own confirmed Waterloo Auth account for real API tests. Dashboard organization membership and app Auth accounts are separate: a dashboard invite is only needed to inspect/administer project content, not to call app APIs. Keep RLS enabled. Existing confirmed fixture accounts can sign in with their own passwords; do not share a common login. A new account needs createMyProfile before creating posts or conversations. Having .env configured does not authenticate the mock Continue button.

Supabase tasks before feature integration: verify authenticated access with ordinary user sessions; configure custom SMTP before general signup email testing; implement confirmation/deep-link callbacks and session routing in the Login feature. Configure redirect URLs for the chosen auth flows. Realtime publication/subscriptions and Storage buckets/policies are needed only when those features are implemented. No further table creation or reseeding is required for this development project. Do not rerun the schema migration. Reconcile manually applied migration history before adopting CLI deployment.

The seed maps A/Maya and B/Jordan to the moving conversation; C/Aisha can read only the pets conversation with A. Test with normal signed-in clients, not SQL Editor's postgres role. Hosted permission verification is not yet claimed complete.

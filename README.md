# This4That

SCRUM-23 foundation: one Expo SDK 57 + React Native + TypeScript application for iOS, Android, and web. Feature screens are intentionally placeholders; there is no authentication, persistence, API, or backend.

## Setup

Use Node 22 LTS or a newer supported release and npm. Commit the lockfile when dependencies change.

```sh
npm ci
npm start
npm run web
npm run ios
npm run android
npm run typecheck
npm run lint
npm run build:web
npx expo install --check
```

iOS requires macOS/Xcode for the simulator; Android requires Android Studio and an emulator or attached device. Expo Go must support the installed SDK; otherwise create a development build. Web uses Metro and React Native Web. Production web hosts must rewrite unknown URLs to index.html because the export uses SPA output.

## Architecture and routes

- `app/_layout.tsx`: root Stack and bundled Inter fonts.
- `app/index.tsx`: redirects to Login; Login can continue to Home with no real authentication.
- `app/(tabs)/_layout.tsx`: Home, Search, Messages, My Profile bottom tabs.
- Routes: `/login`, `/home`, `/search`, `/messages`, `/profile`, `/post/new`, `/post/:id`, `/chat/:id`, `/user/:id`.
- `components/ui`: Button (primary/secondary, disabled/loading), Input (controlled values, labels, errors, TextInput props), Card (optional press), Avatar (image or initials, failed-image fallback).
- `components/Screen.tsx`: safe areas, scroll/keyboard support, horizontal padding, desktop maximum width.
- `constants/theme.ts`: centralized Figma values; provenance and deliberate conventions in `docs/design.md`.
- `types/index.ts`: User, Post, Message, Conversation models. Timestamps are ISO strings; relationships use IDs. Conversation.lastMessageId references centralized messages.
- `data/mockData.ts`: users, currentUser, posts, conversations, messages with consistent relationships. Email addresses are fictional fixture addresses, not login credentials.
- `assets/icons`: bundled Figma navigation SVGs.

## Collaboration

Replace your assigned placeholder in `app/` and keep route names stable. Files inside `app/` are routes; place feature-specific components in `components/<feature>/`, not in `app/`. Add a route file and, if needed, configure its header in the root Stack. Coordinate edits to shared layouts, theme, models, package.json, and lockfile.

```tsx
import { router } from 'expo-router';
import { Button, Input, Card, Avatar } from './components/ui';
import { posts } from './data/mockData';

router.push({ pathname: '/post/[id]', params: { id: posts[0].id } });
```

Use relative import paths appropriate to the file. Use `router.push` for detail navigation and `router.replace` for the mock entry flow. Browser history is handled by Expo Router. Unknown IDs render a clear mock-record message; unknown routes render a recovery screen. Use `Screen` and shared theme tokens rather than repeating styles. Inputs accept standard React Native TextInput props; maintain value state in the feature screen. Buttons expose Pressable props and style overrides. Cards accept View props and optional onPress.

## Validation

See `docs/validation.md` for checks performed and environment limitations. Mobile runtime validation is separate from compilation and web verification.

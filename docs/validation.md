# SCRUM-23 validation — October 11, 2026

Passed:

- `npm run typecheck` (strict TypeScript, including generated Router types).
- `npm run lint` (Expo ESLint; cleared stale cache after installing expo-image).
- `npm run build:web` (Metro SPA export, four local SVGs and four bundled Inter weights).
- `npx expo export --platform ios --platform android --output-dir /private/tmp/this4that-native-export` (both Hermes bundles).
- `npx expo install --check` with network enabled (dependencies up to date).
- `CI=1 npx expo start --web --port 8081`: Metro started and browser loaded `/login`, displaying Avatar, controlled Input, enabled/disabled Button, and Card.
- Required route files verified; typed route destinations compile.
- Mock relationships verified across all users, posts, conversations, and messages.
- SVG files are nonempty, have 24×24 root dimensions, and are bundled at explicit 24×24 tab callsites.

Outstanding validation:

- Interactive tab/detail navigation and browser back/forward were interrupted by user browser activity. Route compilation is not evidence that these interactions were runtime-tested.
- Navigation icon appearance/geometry still needs rendered visual inspection on the tab screens.
- iOS/Android runtime testing was not performed. `xcrun simctl help` failed with exit 72; no Android emulator was used. Native bundle export is not device testing.
- Tablet and narrow web layouts still need visual QA.
- npm audit reports 29 dependency findings (11 moderate, 18 high) in the current SDK dependency tree. Several suggested fixes downgrade Expo/React Native or move Router to a different SDK. No forced SDK-breaking audit fix was applied. Reassess advisories before production deployment.

Manual handoff check: continue from Login to Home; select all four tabs; open a post and return; open New Post; open a chat and public profile; exercise browser back/forward; directly load each dynamic URL; check unknown IDs and unknown paths; repeat at phone/tablet/desktop sizes and on devices.

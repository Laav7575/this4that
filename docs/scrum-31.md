# SCRUM-31 — shared navigation

Active navigation icons and labels use orange #FF6B35; inactive navigation uses black #000000. Primary tab metadata, icon rendering and the Add Post header action are shared in components/navigation. Original local SVG paths render through react-native-svg with explicit stroke colors because expo-image tintColor did not recolor SVG assets on web.

Home, Messages, and Profile use the same 44×44 Add Post hit target with a 24px icon and an 8px right inset. Home's former floating button is removed; search remains beside Add Post. Redundant Home header shortcuts to Messages/Profile are available through bottom tabs. Home's bottom label stays Home independently of the This4That header title. Chat retains the same tab names, icons and state colors.

Validation: TypeScript and web export pass. Scoped lint passes for the navigation components, tab layout and Home; Messages retains its existing refresh dependency warning. Repository-wide lint still fails on pre-existing react-hooks/set-state-in-effect errors in app/_layout.tsx and app/reset-password.tsx, plus existing dependency warnings in Messages and Chat.

Browser demo-mode verification: Home, Messages, Profile and Chat navigation checked; Add Post from Profile opens /post/new. Navigation checked at desktop, 375×812 and 320×740 web viewports. Messages and Profile show matching header action placement at 320px. Active/inactive icon and label colors visually verified. No real messages/posts were submitted and no backend code changed. iOS/Android runtime testing remains outstanding.

Existing issue outside this ticket: Home feed uses three columns in narrow web previews, squeezing post contents. Header and bottom navigation remain usable; feed responsiveness should be handled in a separate ticket.

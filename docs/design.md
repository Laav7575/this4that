# Figma foundation reference

Inspected This4That file NbWNcVDb4wJCWaQkg2Q7lC, App page 13:1711, on October 11, 2026 using connected Figma design context and screenshots.

| Screen | Node |
| --- | --- |
| Login | 38:390 |
| Home | 38:433 |
| Search | 15:810 |
| Messages | 49:371 |
| My Profile shell | 15:573 |
| New Post | 67:2397 |
| Post Details | 67:2119 |
| Public Profile | 67:2203 |

Shared values: ocean teal #49BEAA, coral #F76C5E, soft pink #FFE6E8, midnight violet #170A1C, body #27364B, secondary text #707988, canvas #FAFAFA, surface #FFFFFF, border #DDDDDD. Inter regular/medium/semibold/bold; body 14/20px, caption 12/16px, heading 20/24px. Spacing 4/8/12/16/20/24px, input radius 8px, detail card radius 12px, button radius 5px. Inputs minimum 44px; avatars 40 and 72px. Header 52px, tab bar 64px. Figma buttons are 35–37px; shared buttons use a 44px minimum touch target per header documentation and accessibility needs.

The inspected App page contains mobile frames (390×844), no desktop/tablet layouts. A 720px content limit is a documented foundation convention, not a Figma token. Error red is also a foundation convention. The My Profile design is currently an empty app shell. Navigation drawings contain Home/Messages/Profile; Search and its filters are implemented from Home rather than as a separate tab. Labels are included for clarity/accessibility.

Local SVGs reproduce the inspected Home, Messages, Profile, and Search icons at their 24px navigation slots. expo-image renders them across platforms; active tint follows the coral active navigation treatment. Feature artwork is deliberately excluded because feature screens are placeholders.

These routes demonstrate the foundation only; they do not reproduce complete feature screens. Feature owners should inspect their own current Figma nodes before implementation.

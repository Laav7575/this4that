/** Extracted from This4That Figma App page; see docs/design.md for provenance. */
export const theme = {
  colors: {
    primary: '#49BEAA', secondary: '#F76C5E', background: '#FAFAFA',
    surface: '#FFFFFF', highlight: '#FFE6E8', text: '#170A1C',
    body: '#27364B', muted: '#707988', border: '#DDDDDD',
    success: '#23836F', successSurface: '#EAF8F5', subtle: '#F4F0F6',
    error: '#B42318', // Foundation accessibility/error convention; absent from inspected designs.
  },
  typography: {
    regular: 'Inter_400Regular', medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold',
    body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
    caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
    label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
    button: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 17 },
    heading: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 24 },
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { button: 5, md: 8, lg: 12, full: 999 },
  dimensions: { input: 44, touchTarget: 44, header: 52, tabBar: 64, avatar: 40, avatarLarge: 72,
    contentMaxWidth: 720 }, // Desktop convention; mobile Figma frames are 390px wide.
} as const;

import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../../constants/theme';

export function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityLabel="Verified University of Waterloo student"
    >
      <Circle
        cx="12"
        cy="12"
        r="9.5"
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth="2"
      />
      <Path
        d="M7.5 12.5l3 3 6-6.5"
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PostTypeIcon({
  type,
  size = 18,
}: {
  type: 'Offer' | 'Request';
  size?: number;
}) {
  const color =
    type === 'Offer' ? theme.colors.primary : theme.colors.secondary;
  return type === 'Offer' ? (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  ) : (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
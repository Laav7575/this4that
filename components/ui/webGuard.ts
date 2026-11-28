import { Platform, type ViewProps } from 'react-native';

export const webGuard = (
  Platform.OS === 'web'
    ? {
        onStartShouldSetResponder: () => true,
        onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
      }
    : {}
) as ViewProps;

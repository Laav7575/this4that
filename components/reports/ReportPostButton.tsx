import { useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { ReportDialog } from './ReportDialog';

export function ReportPostButton({
  postId,
  authorId,
  authorName,
  currentUserId,
}: {
  postId: string;
  authorId: string;
  authorName: string;
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  if (currentUserId && currentUserId === authorId) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Report post"
        hitSlop={8}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          {
            minWidth: theme.dimensions.touchTarget,
            minHeight: theme.dimensions.touchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M5 21V4m0 0h11l-2 4 2 4H5"
            fill="none"
            stroke={theme.colors.muted}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
      <ReportDialog
        visible={open}
        onClose={() => setOpen(false)}
        context="post"
        reportedUserId={authorId}
        reportedName={authorName}
        postId={postId}
      />
    </>
  );
}
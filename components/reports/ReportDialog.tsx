import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';
import { Button, Input } from '../ui';
import { theme } from '../../constants/theme';
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  type ReportContext,
} from '../../data/reportReasons';
import { submitReport } from '../../services/reports';

/**
 * On web, React events from a Modal still bubble through the React tree (the modal renders in a portal
 * but is not detached from its parents), so a tap inside the dialog could trigger a Pressable the dialog
 * sits inside, such as a post card. Claiming the touch and stopping the click here prevents that.
 */
const webGuard = (
  Platform.OS === 'web'
    ? {
        onStartShouldSetResponder: () => true,
        onClick: (event: { stopPropagation: () => void }) =>
          event.stopPropagation(),
      }
    : {}
) as ViewProps;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Where the report starts. Decides which reasons are offered. */
  context: ReportContext;
  reportedUserId: string;
  reportedName: string;
  postId?: string;
  conversationId?: string;
};

const TITLES: Record<ReportContext, string> = {
  post: 'Report post',
  message: 'Report conversation',
  profile: 'Report profile',
};

const sentThisSession = new Set<string>();

function ReportForm({
  onClose,
  context,
  reportedUserId,
  reportedName,
  postId,
  conversationId,
}: Props) {
  const key = [context, reportedUserId, postId ?? '', conversationId ?? ''].join(':');
  const [reason, setReason] = useState<string>();
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(sentThisSession.has(key));
  const [error, setError] = useState<string>();

  const send = async () => {
    if (!reason) {
      setError('Choose what best describes the problem.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      setError('Tell us what happened.');
      return;
    }
    setSending(true);
    setError(undefined);
    try {
      await submitReport({
        context,
        reason,
        details,
        reportedUserId,
        postId,
        conversationId,
      });
      sentThisSession.add(key);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not send your report. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.backdrop} {...webGuard}>
      <View style={styles.card} accessibilityViewIsModal {...webGuard}>
        {done ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              Thanks for letting us know
            </Text>
            <Text style={styles.body}>
              Our team will review your report and decide what to do.{' '}
              {reportedName} won’t be told that you reported them.
            </Text>
            <Button label="Done" onPress={onClose} />
          </>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text accessibilityRole="header" style={styles.title}>
              {TITLES[context]}
            </Text>
            <Text style={styles.body}>
              Reports are private, and we review each one before taking any
              action.
              {context === 'message'
                ? ' We’ll receive the most recent messages in this conversation so we can see what happened.'
                : ''}{' '}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.reasons}>
              {REPORT_REASONS[context].map((item) => {
                const selected = reason === item.value;
                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${item.label}. ${item.hint}`}
                    onPress={() => {
                      setReason(item.value);
                      setError(undefined);
                    }}
                    style={[styles.reason, selected && styles.reasonSelected]}
                  >
                    <View
                      style={[styles.radio, selected && styles.radioSelected]}
                    >
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <View style={styles.reasonText}>
                      <Text style={styles.reasonLabel}>{item.label}</Text>
                      <Text style={styles.hint}>{item.hint}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Input
              label={
                reason === 'other'
                  ? 'What happened?'
                  : 'Anything else we should know? (optional)'
              }
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              maxLength={REPORT_DETAILS_MAX}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <Button label="Submit report" onPress={send} loading={sending} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={sending}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export function ReportDialog(props: Props) {
  // The form only exists while the modal is open, so it starts fresh every time.
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      {props.visible ? <ReportForm {...props} /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  content: { gap: theme.spacing.md },
  title: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.body },
  reasons: { gap: theme.spacing.sm },
  reason: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
    minHeight: theme.dimensions.touchTarget,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  reasonSelected: { borderColor: theme.colors.primary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  reasonText: { flex: 1, gap: 2 },
  reasonLabel: {
    fontFamily: theme.typography.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  hint: { ...theme.typography.caption, color: theme.colors.muted },
  error: { ...theme.typography.body, color: theme.colors.error },
});
import { useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { theme } from '../../constants/theme';

/** Explicit confirmation, pending/error states, and retry on both web and native. */
export function ConfirmAction({ label, description, onConfirm, disabled = false, variant = 'secondary', compact = false }: {
  label: string; description: string; onConfirm: () => Promise<void>; disabled?: boolean; variant?: 'primary' | 'secondary'; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const confirm = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await onConfirm(); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update status. Please try again.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <>
    <Button label={label} variant={variant} style={compact ? styles.compact : undefined} disabled={disabled} onPress={() => { setError(''); setOpen(true); }} />
    <Modal transparent visible={open} animationType="fade" onRequestClose={() => { if (!pending.current) setOpen(false); }}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{label}?</Text>
          <Text style={styles.body}>{description}</Text>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Button label={label} loading={busy} onPress={() => { void confirm(); }} />
          <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  compact: { paddingHorizontal: 8, flex: 1, minHeight: 48 },
  backdrop: { flex: 1, backgroundColor: 'rgba(23,10,28,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 24, gap: 16 },
  title: { ...theme.typography.heading, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.body },
  error: { ...theme.typography.body, color: theme.colors.error },
});

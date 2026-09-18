import {
  Modal,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native'
import { payTheme } from './theme'
import { type UseCheckoutResult, type CheckoutPhase } from './useCheckout'

const PHASE_MESSAGE: Record<CheckoutPhase, string> = {
  idle: '',
  initiating: 'Starting payment…',
  awaiting_confirmation: 'Check your phone and enter your PIN to confirm.',
  redirecting: 'Opening secure payment…',
  polling: 'Confirming payment…',
  paid: 'Payment confirmed. Thank you!',
  failed: 'Payment did not go through.',
  retryable: 'Payment was not completed. You can try again.',
  timeout: 'Still confirming. This can take a moment.',
  error: 'Something went wrong starting the payment.',
}

export interface MitumbaPaySheetProps {
  visible: boolean
  checkout: UseCheckoutResult
  onPay: () => void
  onClose: () => void
  amountLabel?: string
  title?: string
}

/**
 * A native bottom sheet that renders payment UI in React Native and drives the
 * {@link useCheckout} controller. No WebView — initiation and polling go through
 * the typed @mitumba/pay client directly.
 */
export function MitumbaPaySheet({
  visible,
  checkout,
  onPay,
  onClose,
  amountLabel,
  title = 'Complete your payment',
}: MitumbaPaySheetProps) {
  const { phase, error } = checkout
  const busy = phase === 'initiating' || phase === 'polling' || phase === 'redirecting'
  const showRetry = phase === 'retryable' || phase === 'failed' || phase === 'error'
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button">
        <Pressable
          style={styles.sheet}
          onPress={(e: GestureResponderEvent) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {amountLabel ? <Text style={styles.amount}>{amountLabel}</Text> : null}
          </View>

          {message ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.message, phase === 'paid' ? styles.messagePaid : null]}
            >
              {message}
            </Text>
          ) : null}

          {phase !== 'paid' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled: busy }}
              disabled={busy}
              onPress={onPay}
              style={[styles.button, busy ? styles.buttonBusy : null]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{showRetry ? 'Try again' : 'Pay now'}</Text>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: payTheme.color.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: payTheme.color.surface,
    borderTopLeftRadius: payTheme.radius.lg,
    borderTopRightRadius: payTheme.radius.lg,
    padding: payTheme.space.lg,
    gap: payTheme.space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: payTheme.color.border,
    marginBottom: payTheme.space.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 18, fontWeight: '600', color: payTheme.color.ink },
  amount: { fontSize: 16, fontWeight: '700', color: payTheme.color.earth },
  message: { fontSize: 14, color: payTheme.color.muted },
  messagePaid: { color: payTheme.color.success },
  button: {
    backgroundColor: payTheme.color.green,
    borderRadius: payTheme.radius.md,
    paddingVertical: payTheme.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonBusy: { backgroundColor: payTheme.color.greenDark },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})

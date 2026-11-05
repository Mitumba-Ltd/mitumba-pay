import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import type {
  CheckoutMethodDescriptor,
  CheckoutInputField,
  SessionPaymentMethod,
} from '@mitumba/pay'
import { payTheme as t } from './theme'
import { formatMoney } from './formatMoney'
import { type UseCheckoutSessionResult, type SessionPhase } from './useCheckoutSession'

const PHASE_MESSAGE: Record<SessionPhase, string> = {
  idle: '',
  loading_context: 'Loading secure checkout…',
  ready: '',
  initiating: 'Starting your secure payment…',
  awaiting_confirmation: 'Check your phone and enter your PIN to approve.',
  redirecting: 'Opening secure checkout…',
  polling: 'We’re confirming your payment…',
  paid: 'Payment received. Your order is confirmed.',
  failed: 'That payment didn’t go through.',
  retryable: 'Payment wasn’t completed. You can safely try again.',
  timeout: 'Still confirming. Keep this sheet open or check your order shortly.',
  error: 'We couldn’t load or start the payment.',
}

export interface MitumbaPaySessionSheetProps {
  visible: boolean
  checkout: UseCheckoutSessionResult
  /** Produce an idempotency key for one attempt (e.g. a UUID). */
  idempotencyKey: () => string
  onClose: () => void
  title?: string
}

/**
 * Session-driven native checkout (RFC 0001). Renders entirely from the
 * authoritative CheckoutSessionContext: the amount, line items, and the
 * server-authored `available_methods` — provider names never appear and the
 * client never asserts amount, currency, country, or methods. The buyer picks
 * one method; the backend picks the provider; the UI follows `next_action`.
 */
export function MitumbaPaySessionSheet({
  visible,
  checkout,
  idempotencyKey,
  onClose,
  title = 'Choose how to pay',
}: MitumbaPaySessionSheetProps) {
  const { phase, context, error } = checkout
  const methods = context?.available_methods ?? []
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Default the selection to the first available method once context loads.
  useEffect(() => {
    if (!selectedType && methods.length > 0) setSelectedType(methods[0]!.type)
  }, [methods, selectedType])

  const selected = useMemo(
    () => methods.find((m) => m.type === selectedType) ?? null,
    [methods, selectedType],
  )

  const busy =
    phase === 'loading_context' ||
    phase === 'initiating' ||
    phase === 'polling' ||
    phase === 'redirecting' ||
    phase === 'awaiting_confirmation'
  const done = phase === 'paid'
  const failed = phase === 'failed' || phase === 'retryable' || phase === 'error'
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]

  const requiredFields = selected?.input_fields.filter((f) => f.required) ?? []
  const fieldsComplete = requiredFields.every((f) => (fieldValues[f.name] ?? '').trim().length > 0)
  const methodUnavailable = selected?.status === 'temporarily_unavailable'
  const disabled = busy || done || !selected || methodUnavailable || !fieldsComplete

  const submit = () => {
    if (!selected) return
    const method = buildMethod(selected, fieldValues)
    if (!method) return
    void checkout.pay(method, idempotencyKey())
  }

  const amountLabel = context
    ? formatMoney(context.amount, context.market.code === 'KE' ? 'en-KE' : undefined)
    : ''

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close payment"
        />
        <ScrollView
          style={styles.checkout}
          contentContainerStyle={styles.checkoutContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.brand}>
                <Text style={styles.brandMark}>M</Text>
                <Text style={styles.brandText}>Mitumba Pay</Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close payment"
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.eyebrow}>AMOUNT DUE</Text>
            <Text style={styles.amount}>{amountLabel}</Text>
            {context && context.line_items.length > 0 ? (
              <View style={styles.lines}>
                {context.line_items.map((item) => (
                  <View key={item.label} style={styles.line}>
                    <Text style={styles.lineLabel}>{item.label}</Text>
                    <View style={styles.dots} />
                    <Text style={styles.lineValue}>
                      {formatMoney(item.amount, context.market.code === 'KE' ? 'en-KE' : undefined)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {context ? <Text style={styles.order}>Ref · {context.reference}</Text> : null}
          </View>

          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{done ? 'Payment complete' : title}</Text>

            {phase === 'loading_context' || (busy && !done) ? (
              <Outcome message={message} loading />
            ) : done ? (
              <Outcome message={message} success />
            ) : (
              <>
                <View style={styles.methods} accessibilityRole="radiogroup">
                  {methods.map((m) => {
                    const active = m.type === selectedType
                    const unavailable = m.status === 'temporarily_unavailable'
                    return (
                      <Pressable
                        key={m.type}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active, disabled: unavailable }}
                        disabled={unavailable}
                        onPress={() => setSelectedType(m.type)}
                        style={[
                          styles.method,
                          active ? styles.methodActive : null,
                          unavailable ? styles.methodDisabled : null,
                        ]}
                      >
                        <View style={styles.methodCopy}>
                          <Text style={[styles.methodTitle, active ? styles.methodTitleActive : null]}>
                            {m.display_name}
                          </Text>
                          {unavailable ? (
                            <Text style={styles.methodHint}>Temporarily unavailable</Text>
                          ) : null}
                        </View>
                        <View style={[styles.radio, active ? styles.radioActive : null]}>
                          {active ? <View style={styles.radioDot} /> : null}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>

                {selected && !methodUnavailable
                  ? selected.input_fields.map((field) => (
                      <Field
                        key={field.name}
                        field={field}
                        value={fieldValues[field.name] ?? ''}
                        onChange={(v) =>
                          setFieldValues((prev) => ({ ...prev, [field.name]: v }))
                        }
                        editable={!busy}
                      />
                    ))
                  : null}

                {failed && message ? (
                  <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>
                    {message}
                  </Text>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled }}
                  disabled={disabled}
                  onPress={submit}
                  style={[styles.payButton, disabled ? styles.payButtonDisabled : null]}
                >
                  <Text style={styles.payButtonText}>
                    {failed ? 'Try again' : amountLabel ? `Pay ${amountLabel}` : 'Pay'}
                  </Text>
                </Pressable>
              </>
            )}

            <View style={styles.security}>
              <Text style={styles.securityText}>Encrypted and securely processed by Mitumba</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function Field({
  field,
  value,
  onChange,
  editable,
}: {
  field: CheckoutInputField
  value: string
  onChange: (v: string) => void
  editable: boolean
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <View style={styles.inputWrap}>
        {field.calling_code ? <Text style={styles.country}>{field.calling_code}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.example ?? ''}
          placeholderTextColor={t.color.faint}
          keyboardType={field.type === 'tel' ? 'phone-pad' : 'default'}
          editable={editable}
          style={styles.input}
          accessibilityLabel={field.label}
        />
      </View>
    </View>
  )
}

function Outcome({ message, success, loading }: { message: string; success?: boolean; loading?: boolean }) {
  return (
    <View style={styles.outcome} accessibilityLiveRegion="polite">
      <View style={[styles.outcomeIcon, success ? styles.outcomeSuccess : null]}>
        {loading ? (
          <ActivityIndicator color={t.color.green} />
        ) : (
          <Text style={[styles.outcomeIconText, success ? styles.outcomeSuccessText : null]}>✓</Text>
        )}
      </View>
      <Text style={styles.outcomeMessage}>{message}</Text>
    </View>
  )
}

/**
 * Build the typed SessionPaymentMethod from a descriptor + collected fields.
 * mobile_money requires a `phone` field; card carries no fields. Unknown method
 * types without a known shape return null (the UI should not guess).
 */
function buildMethod(
  descriptor: CheckoutMethodDescriptor,
  values: Record<string, string>,
): SessionPaymentMethod | null {
  if (descriptor.type === 'card') return { type: 'card' }
  if (descriptor.type === 'mobile_money') {
    const phone = (values.phone ?? '').trim()
    return phone ? { type: 'mobile_money', phone } : null
  }
  return null
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: t.color.scrim, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  checkout: {
    width: '100%',
    maxHeight: '96%',
    backgroundColor: t.color.green,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    overflow: 'hidden',
  },
  checkoutContent: { flexGrow: 1 },
  hero: { position: 'relative', paddingTop: t.space.lg, paddingHorizontal: t.space.lg, paddingBottom: 50 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: t.color.onGreen,
    fontWeight: '800',
  },
  brandText: { color: t.color.onGreen, fontSize: 14, fontWeight: '700' },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: t.color.onGreen, fontSize: 25, lineHeight: 27, fontWeight: '300' },
  eyebrow: {
    marginTop: 26,
    color: t.color.onGreenMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  amount: {
    marginTop: 5,
    color: t.color.onGreen,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  lines: { marginTop: 20, gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { color: t.color.onGreenMuted, fontSize: 12 },
  dots: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: 'rgba(255,255,255,0.3)' },
  lineValue: { color: t.color.onGreen, fontSize: 12, fontWeight: '600' },
  order: { marginTop: 16, color: t.color.onGreenMuted, fontSize: 11, textAlign: 'center' },
  sheet: {
    marginTop: -26,
    paddingTop: 12,
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space.lg,
    backgroundColor: t.color.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: t.color.border, marginBottom: 18 },
  title: { color: t.color.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  methods: { marginTop: 20, gap: 10 },
  method: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: t.radius.md,
    backgroundColor: t.color.surface,
  },
  methodActive: { borderColor: t.color.green, backgroundColor: t.color.greenSoft },
  methodDisabled: { opacity: 0.5 },
  methodCopy: { flex: 1 },
  methodTitle: { color: t.color.ink, fontSize: 14, fontWeight: '600' },
  methodTitleActive: { color: t.color.greenDark },
  methodHint: { marginTop: 2, color: t.color.muted, fontSize: 11 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: t.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: t.color.green },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.green },
  fieldGroup: { marginTop: 20 },
  fieldLabel: { color: t.color.muted, fontSize: 12, marginBottom: 7 },
  inputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.color.border,
    borderRadius: t.radius.md,
    backgroundColor: t.color.field,
    paddingHorizontal: 13,
  },
  country: { color: t.color.ink, fontSize: 13, fontWeight: '700', paddingRight: 12, borderRightWidth: 1, borderRightColor: t.color.border },
  input: { flex: 1, color: t.color.ink, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12 },
  errorMessage: {
    marginTop: 12,
    padding: 10,
    borderRadius: t.radius.sm,
    backgroundColor: t.color.dangerSoft,
    color: t.color.danger,
    fontSize: 12,
  },
  payButton: {
    minHeight: 54,
    marginTop: 20,
    borderRadius: t.radius.md,
    backgroundColor: t.color.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: { opacity: 0.48 },
  payButtonText: { color: t.color.onGreen, fontSize: 15, fontWeight: '700' },
  security: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  securityText: { color: t.color.faint, fontSize: 10 },
  outcome: { alignItems: 'center', paddingVertical: 42 },
  outcomeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.color.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeSuccess: { backgroundColor: t.color.green },
  outcomeIconText: { color: t.color.green, fontSize: 28, fontWeight: '800' },
  outcomeSuccessText: { color: t.color.onGreen },
  outcomeMessage: { maxWidth: 280, marginTop: 18, color: t.color.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
})

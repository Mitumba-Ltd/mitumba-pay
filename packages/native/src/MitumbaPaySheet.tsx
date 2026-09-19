import { useEffect, useState } from 'react'
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
import { payTheme as t } from './theme'
import { type UseCheckoutResult, type CheckoutPhase } from './useCheckout'

export type NativePaymentMethod = 'mobile_money' | 'card'
export interface NativeLineItem { label: string; value: string }

const PHASE_MESSAGE: Record<CheckoutPhase, string> = {
  idle: '',
  initiating: 'Starting your secure payment…',
  awaiting_confirmation: 'Check your phone and enter your PIN to approve.',
  redirecting: 'Opening secure card checkout…',
  polling: 'We’re confirming your payment…',
  paid: 'Payment received. Your order is confirmed.',
  failed: 'That payment didn’t go through.',
  retryable: 'Payment wasn’t completed. You can safely try again.',
  timeout: 'Still confirming. Keep this sheet open or check your order shortly.',
  error: 'We couldn’t start the payment.',
}

export interface MitumbaPaySheetProps {
  visible: boolean
  checkout: UseCheckoutResult
  onPay: (input?: { method: NativePaymentMethod; phone?: string }) => void
  onClose: () => void
  amountLabel?: string
  title?: string
  orderId?: string
  lineItems?: NativeLineItem[]
  methods?: NativePaymentMethod[]
  defaultPhone?: string
}

/**
 * Native, mobile-first checkout: amount context in a green hero and payment
 * actions in a thumb-friendly white sheet. No WebView; all behavior flows
 * through the typed @mitumba/pay client.
 */
export function MitumbaPaySheet({
  visible,
  checkout,
  onPay,
  onClose,
  amountLabel = 'Amount due',
  title = 'Choose how to pay',
  orderId,
  lineItems = [],
  methods = ['mobile_money', 'card'],
  defaultPhone = '',
}: MitumbaPaySheetProps) {
  const [method, setMethod] = useState<NativePaymentMethod>(methods[0] ?? 'mobile_money')
  const [phone, setPhone] = useState(defaultPhone)
  const { phase, error } = checkout

  useEffect(() => setPhone(defaultPhone), [defaultPhone])
  const busy = phase === 'initiating' || phase === 'polling' || phase === 'redirecting' || phase === 'awaiting_confirmation'
  const done = phase === 'paid'
  const failed = phase === 'failed' || phase === 'retryable' || phase === 'error'
  const message = phase === 'error' && error ? error.message : PHASE_MESSAGE[phase]
  const validPhone = /^\+254\d{9}$/.test(phone)
  const disabled = busy || done || (method === 'mobile_money' && !validPhone)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close payment" />
        <ScrollView
          style={styles.checkout}
          contentContainerStyle={styles.checkoutContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroPattern} />
            <View style={styles.heroHeader}>
              <View style={styles.brand}><Text style={styles.brandMark}>M</Text><Text style={styles.brandText}>Mitumba Pay</Text></View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close payment" style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            <Text style={styles.eyebrow}>AMOUNT DUE</Text>
            <Text style={styles.amount}>{amountLabel}</Text>
            {lineItems.length > 0 ? <View style={styles.lines}>{lineItems.map((item) => <View key={item.label} style={styles.line}><Text style={styles.lineLabel}>{item.label}</Text><View style={styles.dots} /><Text style={styles.lineValue}>{item.value}</Text></View>)}</View> : null}
            {orderId ? <Text style={styles.order}>Order · {orderId}</Text> : null}
          </View>

          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{done ? 'Payment complete' : title}</Text>
            <Text style={styles.subtitle}>{done ? 'Your payment was securely confirmed.' : 'Select a payment method to continue'}</Text>

            {done ? (
              <Outcome icon="✓" message={message} success />
            ) : busy ? (
              <Outcome icon="▣" message={message} loading />
            ) : (
              <>
                <View style={styles.methods} accessibilityRole="radiogroup">
                  {methods.map((item) => {
                    const active = method === item
                    return (
                      <Pressable
                        key={item}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        onPress={() => setMethod(item)}
                        style={[styles.method, active ? styles.methodActive : null]}
                      >
                        <Text style={[styles.methodIcon, active ? styles.methodIconActive : null]}>{item === 'mobile_money' ? '▣' : '▤'}</Text>
                        <View style={styles.methodCopy}>
                          <Text style={[styles.methodTitle, active ? styles.methodTitleActive : null]}>{item === 'mobile_money' ? 'Mobile payment' : 'Card'}</Text>
                          <Text style={styles.methodHint}>{item === 'mobile_money' ? 'Pay from your phone' : 'Secure card checkout'}</Text>
                        </View>
                        <View style={[styles.radio, active ? styles.radioActive : null]}>{active ? <View style={styles.radioDot} /> : null}</View>
                      </Pressable>
                    )
                  })}
                </View>

                {method === 'mobile_money' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Mobile number</Text>
                    <View style={[styles.inputWrap, phone.length > 0 && !validPhone ? styles.inputError : null]}>
                      <Text style={styles.country}>KE +254</Text>
                      <TextInput
                        value={displayPhone(phone)}
                        onChangeText={(value) => setPhone(normalizePhone(value))}
                        placeholder="7XX XXX XXX"
                        placeholderTextColor={t.color.faint}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                        editable={!busy}
                        style={styles.input}
                      />
                      {validPhone ? <Text style={styles.valid}>✓</Text> : null}
                    </View>
                    <Text style={[styles.help, phone.length > 0 && !validPhone ? styles.helpError : null]}>{phone.length > 0 && !validPhone ? 'Enter a valid Kenyan mobile number' : 'A secure prompt will appear on your phone.'}</Text>
                  </View>
                ) : (
                  <View style={styles.cardNote}><Text style={styles.cardNoteIcon}>▤</Text><Text style={styles.cardNoteText}>You’ll continue to a secure, PCI-compliant card page. Mitumba never stores your card number.</Text></View>
                )}

                {failed && message ? <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>{message}</Text> : null}

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy, disabled }}
                  disabled={disabled}
                  onPress={() => onPay(method === 'mobile_money' ? { method, phone } : { method })}
                  style={[styles.payButton, disabled ? styles.payButtonDisabled : null]}
                >
                  <Text style={styles.payButtonText}>{failed ? 'Try again' : `Pay ${amountLabel}`}</Text>
                </Pressable>
              </>
            )}

            <View style={styles.security}><Text style={styles.securityLock}>▣</Text><Text style={styles.securityText}>Encrypted and securely processed by Mitumba</Text></View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function Outcome({ icon, message, success, loading }: { icon: string; message: string; success?: boolean; loading?: boolean }) {
  return <View style={styles.outcome} accessibilityLiveRegion="polite"><View style={[styles.outcomeIcon, success ? styles.outcomeSuccess : null]}>{loading ? <ActivityIndicator color={t.color.green} /> : <Text style={[styles.outcomeIconText, success ? styles.outcomeSuccessText : null]}>{icon}</Text>}</View><Text style={styles.outcomeMessage}>{message}</Text></View>
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('254')) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('0')) return `+254${digits.slice(1, 10)}`
  return `+254${digits.slice(0, 9)}`
}

function displayPhone(value: string): string {
  return value.startsWith('+254') ? value.slice(4) : value
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: t.color.scrim, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  checkout: { width: '100%', maxHeight: '96%', backgroundColor: t.color.green, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl, overflow: 'hidden' },
  checkoutContent: { flexGrow: 1 },
  hero: { position: 'relative', paddingTop: t.space.lg, paddingHorizontal: t.space.lg, paddingBottom: 50, overflow: 'hidden' },
  heroPattern: { position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110, borderWidth: 34, borderColor: 'rgba(255,255,255,0.055)' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  brandMark: { width: 30, height: 30, borderRadius: 10, textAlign: 'center', textAlignVertical: 'center', backgroundColor: 'rgba(255,255,255,0.16)', color: t.color.onGreen, fontWeight: '800' },
  brandText: { color: t.color.onGreen, fontSize: 14, fontWeight: '700' },
  closeButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: t.color.onGreen, fontSize: 25, lineHeight: 27, fontWeight: '300' },
  eyebrow: { marginTop: 26, color: t.color.onGreenMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  amount: { marginTop: 5, color: t.color.onGreen, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8, textAlign: 'center' },
  lines: { marginTop: 20, gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { color: t.color.onGreenMuted, fontSize: 12 },
  dots: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: 'rgba(255,255,255,0.3)' },
  lineValue: { color: t.color.onGreen, fontSize: 12, fontWeight: '600' },
  order: { marginTop: 16, color: t.color.onGreenMuted, fontSize: 11, textAlign: 'center' },
  sheet: { marginTop: -26, paddingTop: 12, paddingHorizontal: t.space.lg, paddingBottom: t.space.lg, backgroundColor: t.color.surface, borderTopLeftRadius: t.radius.xl, borderTopRightRadius: t.radius.xl },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: t.color.border, marginBottom: 18 },
  title: { color: t.color.ink, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { marginTop: 4, color: t.color.muted, fontSize: 13 },
  methods: { marginTop: 20, gap: 10 },
  method: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.md, backgroundColor: t.color.surface },
  methodActive: { borderColor: t.color.green, backgroundColor: t.color.greenSoft },
  methodIcon: { width: 38, height: 38, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', backgroundColor: t.color.field, color: t.color.muted, fontSize: 18 },
  methodIconActive: { backgroundColor: t.color.green, color: t.color.onGreen },
  methodCopy: { flex: 1, marginLeft: 12 },
  methodTitle: { color: t.color.ink, fontSize: 14, fontWeight: '600' },
  methodTitleActive: { color: t.color.greenDark },
  methodHint: { marginTop: 2, color: t.color.muted, fontSize: 11 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: t.color.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: t.color.green },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.color.green },
  fieldGroup: { marginTop: 20 },
  fieldLabel: { color: t.color.muted, fontSize: 12, marginBottom: 7 },
  inputWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: t.color.border, borderRadius: t.radius.md, backgroundColor: t.color.field, paddingHorizontal: 13 },
  inputError: { borderColor: t.color.danger },
  country: { color: t.color.ink, fontSize: 13, fontWeight: '700', paddingRight: 12, borderRightWidth: 1, borderRightColor: t.color.border },
  input: { flex: 1, color: t.color.ink, fontSize: 16, paddingHorizontal: 12, paddingVertical: 12 },
  valid: { color: t.color.green, fontWeight: '800' },
  help: { marginTop: 7, color: t.color.faint, fontSize: 11 },
  helpError: { color: t.color.danger },
  cardNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20, padding: 14, backgroundColor: t.color.field, borderRadius: t.radius.md },
  cardNoteIcon: { color: t.color.green, fontSize: 20 },
  cardNoteText: { flex: 1, color: t.color.muted, fontSize: 12, lineHeight: 18 },
  errorMessage: { marginTop: 12, padding: 10, borderRadius: t.radius.sm, backgroundColor: t.color.dangerSoft, color: t.color.danger, fontSize: 12 },
  payButton: { minHeight: 54, marginTop: 20, borderRadius: t.radius.md, backgroundColor: t.color.green, alignItems: 'center', justifyContent: 'center' },
  payButtonDisabled: { opacity: 0.48 },
  payButtonText: { color: t.color.onGreen, fontSize: 15, fontWeight: '700' },
  security: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  securityLock: { color: t.color.faint, fontSize: 10 },
  securityText: { color: t.color.faint, fontSize: 10 },
  outcome: { alignItems: 'center', paddingVertical: 42 },
  outcomeIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.color.greenSoft, alignItems: 'center', justifyContent: 'center' },
  outcomeSuccess: { backgroundColor: t.color.green },
  outcomeIconText: { color: t.color.green, fontSize: 28, fontWeight: '800' },
  outcomeSuccessText: { color: t.color.onGreen },
  outcomeMessage: { maxWidth: 280, marginTop: 18, color: t.color.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
})

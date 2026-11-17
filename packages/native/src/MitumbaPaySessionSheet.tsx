import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Switch,
} from 'react-native'
import type { CheckoutInputField } from '@mitumba/pay'
import { formatMoneyCode, methodDescriptorKey, savedPhoneChoices, sessionRefusal, type SessionRefusal } from '@mitumba/pay'
import { descriptorPhone, initialSessionMethod, sessionMethodFor, sessionMethodTabs } from './methods'
import { payTheme as t } from './theme'
import { formatMoney } from './formatMoney'
import { unavailableMessage } from './unavailable'
import { BrandLogo } from './BrandLogo'
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
  unavailable: unavailableMessage(null),
  error: 'We couldn’t load or start the payment.',
}

export interface MitumbaPaySessionSheetProps {
  visible: boolean
  checkout: UseCheckoutSessionResult
  /** Produce an idempotency key for one attempt (e.g. a UUID). */
  idempotencyKey: () => string
  onClose: () => void
  title?: string
  /**
   * BCP 47 locale for amounts. Without one, amounts show the currency code first (`KES 6,150.00`),
   * as the hosted web checkout does.
   */
  locale?: string
  /** Called once when the loaded session cannot be paid (already paid, expired, cancelled, no method). */
  onRefused?: (refusal: SessionRefusal) => void
}

/**
 * Session-driven native checkout (RFC 0001). Renders entirely from the
 * authoritative CheckoutSessionContext: the amount, line items, and the
 * server-authored `available_methods` — provider names never appear and the
 * client never asserts amount, currency, country, or methods. The buyer picks
 * one method; the backend picks the provider; the UI follows `next_action`.
 *
 * The layout follows the hosted web checkout on a phone: a green summary (logo, amount due, lines,
 * total), then a white panel with "Mobile payment" and "Card" tabs. Mobile payment shows the
 * networks as chips, saved numbers, and the number field. A method the session marks temporarily
 * unavailable stays visible but greyed.
 */
export function MitumbaPaySessionSheet({
  visible,
  checkout,
  idempotencyKey,
  onClose,
  title = 'Payment methods',
  locale,
  onRefused,
}: MitumbaPaySessionSheetProps) {
  const { phase, context, error } = checkout
  const methods = context?.available_methods ?? []
  // Keyed by type and network: mobile money is one descriptor per network (M-Pesa, Airtel Money…).
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const [saveNumber, setSaveNumber] = useState(true)
  const saved = context?.saved_methods ?? []

  const tabs = useMemo(() => sessionMethodTabs(methods), [methods])
  const networks = useMemo(() => methods.filter((m) => m.type === 'mobile_money' && m.network), [methods])

  // Once context loads, preselect the default saved number (its network and phone) when it can be
  // paid now, else the first payable method.
  useEffect(() => {
    if (selectedKey || methods.length === 0) return
    const preferred = saved.find((entry) => entry.is_default) ?? saved[0]
    const initial = initialSessionMethod(methods, preferred?.method.network)
    if (!initial) return
    setSelectedKey(methodDescriptorKey(initial))
    if (preferred && initial.network === preferred.method.network) {
      setFieldValues((prev) => ({ ...prev, phone: preferred.method.phone }))
    }
  }, [methods, saved, selectedKey])

  const selected = useMemo(
    () => methods.find((m) => methodDescriptorKey(m) === selectedKey) ?? null,
    [methods, selectedKey],
  )
  const activeTab = selected?.type === 'card' ? 'card' : 'mobile_money'

  const chooseTab = (type: 'mobile_money' | 'card') => {
    if (type === activeTab) return
    const next = type === 'card'
      ? methods.find((m) => m.type === 'card' && m.status === 'available')
      : initialSessionMethod(networks, undefined)
    if (next) setSelectedKey(methodDescriptorKey(next))
  }

  const busy =
    phase === 'loading_context' ||
    phase === 'initiating' ||
    phase === 'polling' ||
    phase === 'redirecting' ||
    phase === 'awaiting_confirmation'
  const done = phase === 'paid'
  const failed = phase === 'failed' || phase === 'retryable' || phase === 'error' || phase === 'unavailable'
  const message =
    phase === 'unavailable'
      ? unavailableMessage(error?.retryAfterMs)
      : phase === 'error' && error
        ? error.message
        : PHASE_MESSAGE[phase]

  const requiredFields = selected?.input_fields.filter((f) => f.required) ?? []
  const fieldsComplete = requiredFields.every((f) => (fieldValues[f.name] ?? '').trim().length > 0)
  // A typed phone must be a number in the session's market (its field names the calling code).
  const phoneInvalid = selected !== null && descriptorPhone(selected, fieldValues) === null
  // A method this SDK cannot build (e.g. mobile money without a network) is never submitted.
  const unpayable = selected !== null && fieldsComplete && !phoneInvalid && sessionMethodFor(selected, fieldValues) === null
  const methodUnavailable = selected?.status === 'temporarily_unavailable'
  // The selected network's saved numbers, as one-tap choices.
  const savedHere = selected?.type === 'mobile_money' && selected.network
    ? savedPhoneChoices(
        saved.filter((entry) => entry.method.network === selected.network),
        networks.map((m) => ({ id: m.network ?? '', name: m.display_name })),
      )
    : []
  const typedPhone = selected ? descriptorPhone(selected, fieldValues) : null
  // Offer to save a valid mobile-money number that is not already saved on this network.
  const canSave = selected?.type === 'mobile_money' && typeof typedPhone === 'string' && !savedHere.some((choice) => choice.value === typedPhone)
  const disabled = busy || done || !selected || methodUnavailable || !fieldsComplete || phoneInvalid || unpayable

  const submit = () => {
    if (!selected) return
    const method = sessionMethodFor(selected, fieldValues)
    if (!method) return
    void checkout.pay(method, idempotencyKey(), { saveMethod: canSave && saveNumber })
  }

  const money = (value: Parameters<typeof formatMoneyCode>[0]) => (locale ? formatMoney(value, locale) : formatMoneyCode(value))
  const amountLabel = context ? money(context.amount) : ''

  // Judge the loaded session before offering any method; a refusal replaces the form.
  const refusal = useMemo(() => (context ? sessionRefusal(context) : null), [context])
  // Tell the host once per refusal, not on every render.
  const notified = useRef<string | null>(null)
  useEffect(() => {
    if (!refusal || notified.current === refusal.code) return
    notified.current = refusal.code
    onRefused?.(refusal)
  }, [refusal, onRefused])

  const phoneField = selected?.input_fields.find((f) => f.name === 'phone')
  const otherFields = selected && !methodUnavailable ? selected.input_fields.filter((f) => f.name !== 'phone') : []

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
            <BrandLogo height={52} />
            <Text style={styles.eyebrow}>AMOUNT DUE</Text>
            <Text style={styles.amount}>{amountLabel}</Text>
            {context && context.line_items.length > 0 ? (
              <View style={styles.lines} accessibilityLabel="Order summary">
                {context.line_items.map((item) => (
                  <SummaryLine key={item.label} label={item.label} value={money(item.amount)} />
                ))}
                <View style={styles.rule} />
                <SummaryLine label="Total" value={amountLabel} strong />
              </View>
            ) : null}
          </View>

          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeading}>
                <BrandLogo height={40} />
                <Text accessibilityRole="header" style={styles.title}>{done ? 'Payment complete' : title}</Text>
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

            {refusal && !done ? (
              <>
                <Outcome message={refusal.message} refused />
                <Pressable accessibilityRole="button" onPress={onClose} style={styles.payButton}>
                  <Text style={styles.payButtonText}>Close</Text>
                </Pressable>
              </>
            ) : phase === 'loading_context' || (busy && !done) ? (
              <Outcome message={message} loading />
            ) : done ? (
              <Outcome message={message} success />
            ) : (
              <>
                <View style={styles.tabs} accessibilityRole="tablist" accessibilityLabel="Choose payment method">
                  {tabs.map((tab) => {
                    const active = tab.type === activeTab
                    return (
                      <Pressable
                        key={tab.type}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.enabled ? tab.label : `${tab.label}, temporarily unavailable`}
                        accessibilityState={{ selected: active, disabled: !tab.enabled }}
                        disabled={!tab.enabled}
                        onPress={() => chooseTab(tab.type)}
                        style={[styles.tab, active ? styles.tabActive : null]}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            active ? styles.tabTextActive : null,
                            tab.enabled ? null : styles.tabTextDisabled,
                          ]}
                        >
                          {tab.label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                {activeTab === 'card' ? (
                  <View style={styles.cardNote}>
                    <View style={styles.cardIcon}><View style={styles.cardGlyph} /></View>
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle}>Secure card checkout</Text>
                      <Text style={styles.cardText}>
                        Your card details are entered on our PCI-compliant payment page. Mitumba never stores your card number.
                      </Text>
                    </View>
                  </View>
                ) : networks.length === 0 ? (
                  <Text style={styles.note}>Mobile money isn’t available for this payment. Please choose another method.</Text>
                ) : (
                  <>
                    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel="Mobile money network">
                      <Text style={styles.caption}>PAY FROM</Text>
                      <View style={styles.chips}>
                        {networks.map((m) => {
                          const key = methodDescriptorKey(m)
                          const active = key === selectedKey
                          const unavailable = m.status === 'temporarily_unavailable'
                          return (
                            <Pressable
                              key={key}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: active, disabled: unavailable }}
                              disabled={unavailable || busy}
                              onPress={() => setSelectedKey(key)}
                              style={[styles.chip, active ? styles.chipActive : null, unavailable ? styles.chipDisabled : null]}
                            >
                              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                                {unavailable ? `${m.display_name} · Temporarily unavailable` : m.display_name}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                    </View>

                    {savedHere.length > 0 && !methodUnavailable ? (
                      <View style={styles.group} accessibilityLabel="Saved numbers">
                        <Text style={styles.caption}>SAVED NUMBERS</Text>
                        <View style={styles.chips}>
                          {savedHere.map((choice) => {
                            const active = choice.value === typedPhone
                            return (
                              <Pressable
                                key={choice.value}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active, disabled: busy }}
                                disabled={busy}
                                onPress={() => setFieldValues((prev) => ({ ...prev, phone: choice.value }))}
                                style={[styles.chip, active ? styles.chipActive : null]}
                              >
                                <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{choice.label}</Text>
                              </Pressable>
                            )
                          })}
                        </View>
                      </View>
                    ) : null}

                    {phoneField && !methodUnavailable ? (
                      <PhoneField
                        field={phoneField}
                        value={fieldValues.phone ?? ''}
                        valid={typeof typedPhone === 'string'}
                        invalid={phoneInvalid}
                        networkName={selected?.display_name ?? ''}
                        onChange={(v) => setFieldValues((prev) => ({ ...prev, phone: v }))}
                        editable={!busy}
                      />
                    ) : null}
                  </>
                )}

                {otherFields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={fieldValues[field.name] ?? ''}
                    onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.name]: v }))}
                    editable={!busy}
                  />
                ))}

                {canSave ? (
                  <View style={styles.saveRow}>
                    <Text style={styles.saveText}>Save this number for next time</Text>
                    <Switch
                      value={saveNumber}
                      onValueChange={setSaveNumber}
                      disabled={busy}
                      accessibilityLabel="Save this number for next time"
                      trackColor={{ true: t.color.green, false: t.color.border }}
                    />
                  </View>
                ) : null}

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

            <Text style={styles.securityText}>Encrypted and securely processed · Powered by Mitumba</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong ? styles.lineStrong : null]}>{label}</Text>
      <View style={styles.dots} />
      <Text style={[styles.lineValue, strong ? styles.lineStrong : null]}>{value}</Text>
    </View>
  )
}

function PhoneField({
  field,
  value,
  valid,
  invalid,
  networkName,
  onChange,
  editable,
}: {
  field: CheckoutInputField
  value: string
  valid: boolean
  invalid: boolean
  networkName: string
  onChange: (v: string) => void
  editable: boolean
}) {
  const hint = invalid
    ? `Enter a valid mobile number${field.example ? `, for example ${field.example}` : ''}`
    : `A secure ${networkName} prompt will appear on this phone.`
  return (
    <View style={styles.group}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <View style={[styles.underline, invalid ? styles.underlineError : null]}>
        <View style={styles.phoneGlyph} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.example ?? ''}
          placeholderTextColor={t.color.faint}
          keyboardType="phone-pad"
          editable={editable}
          style={styles.phoneInput}
          accessibilityLabel={field.label}
        />
        {valid ? (
          <View style={styles.valid} accessibilityLabel="Valid number">
            <Text style={styles.validText}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.hint, invalid ? styles.hintError : null]}>{hint}</Text>
    </View>
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
    <View style={styles.group}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <View style={styles.underline}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={field.example ?? ''}
          placeholderTextColor={t.color.faint}
          keyboardType={field.type === 'tel' ? 'phone-pad' : 'default'}
          editable={editable}
          style={styles.phoneInput}
          accessibilityLabel={field.label}
        />
      </View>
    </View>
  )
}

function Outcome({ message, success, loading, refused }: { message: string; success?: boolean; loading?: boolean; refused?: boolean }) {
  return (
    <View style={styles.outcome} accessibilityLiveRegion="polite">
      <View style={[styles.outcomeIcon, success ? styles.outcomeSuccess : null, refused ? styles.outcomeRefused : null]}>
        {loading ? (
          <ActivityIndicator color={t.color.green} />
        ) : (
          <Text style={[styles.outcomeIconText, success ? styles.outcomeSuccessText : null, refused ? styles.outcomeRefusedText : null]}>{refused ? '!' : '✓'}</Text>
        )}
      </View>
      <Text style={styles.outcomeMessage}>{message}</Text>
    </View>
  )
}

// Measurements follow the hosted checkout's phone layout (packages/react WIDGET_CSS, max-width 680px).
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
  hero: { paddingTop: 25, paddingHorizontal: 22, paddingBottom: 56 },
  eyebrow: {
    marginTop: 26,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  amount: {
    marginTop: 6,
    color: t.color.onGreen,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -1.3,
    textAlign: 'center',
  },
  lines: { marginTop: 22, gap: 11 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 13 },
  dots: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', borderColor: 'rgba(255,255,255,0.38)' },
  lineValue: { color: t.color.onGreen, fontSize: 13, fontWeight: '600' },
  lineStrong: { color: t.color.onGreen, fontSize: 14, fontWeight: '800' },
  rule: { height: 1, marginVertical: 8, backgroundColor: 'rgba(255,255,255,0.22)' },
  sheet: {
    flexGrow: 1,
    marginTop: -30,
    paddingTop: 27,
    paddingHorizontal: 22,
    paddingBottom: 22,
    backgroundColor: t.color.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 },
  sheetHeading: { flex: 1, gap: 5 },
  title: { color: t.color.ink, fontSize: 22, lineHeight: 26, fontWeight: '500', letterSpacing: -0.8 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6F7F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#607066', fontSize: 24, lineHeight: 26, fontWeight: '300' },
  tabs: { flexDirection: 'row', gap: 22, marginTop: 25, borderBottomWidth: 1, borderBottomColor: '#ECEFEC' },
  tab: { paddingBottom: 14, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: t.color.green },
  tabText: { color: '#68716B', fontSize: 14 },
  tabTextActive: { color: t.color.green, fontWeight: '700' },
  tabTextDisabled: { color: '#B9BEBA' },
  group: { marginTop: 22 },
  caption: { marginBottom: 10, color: '#8B938E', fontSize: 11, letterSpacing: 0.9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: t.radius.pill, backgroundColor: '#F5F6F4' },
  chipActive: { backgroundColor: t.color.green },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: '#59615C', fontSize: 13 },
  chipTextActive: { color: t.color.onGreen, fontWeight: '600' },
  note: {
    marginTop: 22,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDF0ED',
    backgroundColor: '#F7F9F7',
    color: '#59615C',
    fontSize: 13,
    lineHeight: 20,
  },
  cardNote: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDF0ED',
    backgroundColor: '#F7F9F7',
  },
  cardIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#E9F5EC', alignItems: 'center', justifyContent: 'center' },
  cardGlyph: { width: 20, height: 14, borderRadius: 2, borderWidth: 1.6, borderColor: t.color.green },
  cardCopy: { flex: 1 },
  cardTitle: { color: t.color.ink, fontSize: 14, fontWeight: '700' },
  cardText: { marginTop: 6, color: '#707973', fontSize: 12, lineHeight: 19 },
  fieldLabel: { marginBottom: 7, color: '#89908B', fontSize: 12 },
  underline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE4E0',
  },
  underlineError: { borderBottomColor: '#C24B3E' },
  phoneGlyph: { width: 12, height: 19, borderRadius: 3, borderWidth: 1.6, borderColor: '#7E8981' },
  phoneInput: { flex: 1, paddingVertical: 6, color: t.color.ink, fontSize: 17, letterSpacing: 0.7 },
  valid: { width: 21, height: 21, borderRadius: 11, backgroundColor: '#E9F6ED', alignItems: 'center', justifyContent: 'center' },
  validText: { color: t.color.green, fontSize: 12, fontWeight: '800' },
  hint: { marginTop: 9, color: '#9BA19D', fontSize: 11 },
  hintError: { color: '#C24B3E' },
  saveRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  saveText: { flex: 1, color: '#59615C', fontSize: 13 },
  errorMessage: {
    marginTop: 18,
    padding: 11,
    borderRadius: 9,
    backgroundColor: t.color.dangerSoft,
    color: '#A13A30',
    fontSize: 12,
  },
  payButton: {
    minHeight: 54,
    marginTop: 26,
    borderRadius: 4,
    backgroundColor: t.color.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: { opacity: 0.56 },
  payButtonText: { color: t.color.onGreen, fontSize: 15, fontWeight: '700' },
  securityText: { marginTop: 16, color: '#9AA29D', fontSize: 10, textAlign: 'center' },
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
  outcomeRefused: { backgroundColor: t.color.dangerSoft },
  outcomeRefusedText: { color: t.color.danger },
  outcomeMessage: { maxWidth: 280, marginTop: 18, color: t.color.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
})

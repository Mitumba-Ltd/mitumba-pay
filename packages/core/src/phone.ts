/**
 * Phone entry for mobile-money methods, driven by the market (ADR-010): the calling code comes from
 * the host's market or from a session's input field (`calling_code`), never from this package.
 * The backend stays the authority and validates the number against the order's or session's market;
 * this only lets a person type a number the way people write it locally.
 */
export interface PhoneFormat {
  /** E.164 calling code with the plus, e.g. `+254`. */
  callingCode: string
  /**
   * Allowed digit counts after the calling code, without a trunk `0`, e.g. `[9]`. When omitted, any
   * length that keeps the number within E.164 (at most 15 digits) is accepted.
   */
  nationalLength?: readonly number[]
  /** A valid E.164 example, used for placeholders, e.g. `+254712345678`. */
  example?: string
}

const E164_MAX_DIGITS = 15
const MIN_NATIONAL_DIGITS = 4

function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

function fitsNational(national: string, format: PhoneFormat, callingDigits: string): boolean {
  if (national.length === 0 || national.startsWith('0')) return false
  if (format.nationalLength && format.nationalLength.length > 0) {
    return format.nationalLength.includes(national.length)
  }
  return national.length >= MIN_NATIONAL_DIGITS && callingDigits.length + national.length <= E164_MAX_DIGITS
}

/**
 * What a person typed, as E.164 in this market, or null when it cannot be a number here. Accepts the
 * full international form (`+254 712 345 678`), the calling code without the plus (`254712…`), a
 * trunk-prefixed local number (`0712 345 678`) and a bare national number (`712345678`). A stray
 * trunk `0` after the calling code (`+254 0712…`) is tolerated.
 */
export function normalizePhone(input: string, format: PhoneFormat): string | null {
  const callingDigits = digitsOf(format.callingCode)
  if (callingDigits.length === 0) return null
  const trimmed = input.trim()
  const digits = digitsOf(trimmed)
  if (digits.length === 0) return null

  const afterCallingCode = (rest: string): string | null => {
    if (fitsNational(rest, format, callingDigits)) return rest
    if (rest.startsWith('0') && fitsNational(rest.slice(1), format, callingDigits)) return rest.slice(1)
    return null
  }

  if (trimmed.startsWith('+')) {
    if (!digits.startsWith(callingDigits)) return null
    const national = afterCallingCode(digits.slice(callingDigits.length))
    return national === null ? null : `+${callingDigits}${national}`
  }
  if (digits.startsWith('0') && fitsNational(digits.slice(1), format, callingDigits)) {
    return `+${callingDigits}${digits.slice(1)}`
  }
  if (digits.startsWith(callingDigits)) {
    const national = afterCallingCode(digits.slice(callingDigits.length))
    if (national !== null) return `+${callingDigits}${national}`
  }
  if (fitsNational(digits, format, callingDigits)) return `+${callingDigits}${digits}`
  return null
}

/** True when `input` normalizes to a number in this market. */
export function isValidPhone(input: string, format: PhoneFormat): boolean {
  return normalizePhone(input, format) !== null
}

/**
 * The part of an E.164 number after the calling code, for an input that shows the code as a fixed
 * prefix. Anything that does not carry this calling code is returned unchanged.
 */
export function nationalPart(value: string, format: PhoneFormat): string {
  const callingDigits = digitsOf(format.callingCode)
  const prefix = `+${callingDigits}`
  return callingDigits.length > 0 && value.startsWith(prefix) ? value.slice(prefix.length) : value
}

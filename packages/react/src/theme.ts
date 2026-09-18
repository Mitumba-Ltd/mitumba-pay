/**
 * Mitumba brand tokens used by the payment widget. Kept local and minimal so the
 * widget has no heavy design-system dependency. Values mirror @mitumba/tokens.
 */
export const payTheme = {
  color: {
    green: '#3D9A52',
    greenDark: '#2F7A40',
    earth: '#A06235',
    ink: '#1A1A1A',
    muted: '#6B6B6B',
    surface: '#FFFFFF',
    border: '#E4E4E4',
    danger: '#C0392B',
    success: '#3D9A52',
  },
  radius: { sm: 8, md: 12, lg: 16 },
  space: { xs: 4, sm: 8, md: 16, lg: 24 },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
} as const

export type PayTheme = typeof payTheme

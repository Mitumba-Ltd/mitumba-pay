/** Mitumba brand tokens for the native payment sheet. Mirrors @mitumba/tokens. */
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
    scrim: 'rgba(0,0,0,0.4)',
  },
  radius: { sm: 8, md: 12, lg: 20 },
  space: { xs: 4, sm: 8, md: 16, lg: 24 },
} as const

export type PayTheme = typeof payTheme

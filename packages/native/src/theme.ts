/** Mitumba brand tokens for the native payment sheet. Mirrors @mitumba/tokens. */
export const payTheme = {
  color: {
    green: '#3D9A52',
    greenDark: '#2F7A40',
    greenSoft: '#EAF4EC',
    earth: '#A06235',
    ink: '#172019',
    muted: '#667069',
    faint: '#98A09B',
    surface: '#FFFFFF',
    field: '#F5F7F5',
    border: '#E2E8E3',
    danger: '#B74336',
    dangerSoft: '#FFF0EE',
    success: '#3D9A52',
    scrim: 'rgba(8, 21, 12, 0.48)',
    onGreen: '#FFFFFF',
    onGreenMuted: 'rgba(255,255,255,0.72)',
  },
  radius: { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
} as const

export type PayTheme = typeof payTheme

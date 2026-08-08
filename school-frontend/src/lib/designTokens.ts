/**
 * Design tokens from Figma «препод из мгу» (design-screens/pdf-page-*.png).
 * Single source for pixel-perfect pages — import instead of hardcoding hex in each page.
 */
export const design = {
  /** App shell background */
  pageBg: '#F4F7FE',
  cardBg: '#FFFFFF',

  /** Brand / subject accents */
  brandPurple: '#6C63FF',
  brandPurpleDark: '#5A4BFF',
  historyOrange: '#EF6C35',
  historyOrangeAlt: '#F97316',

  /** Neutrals */
  ink: '#1A1D26',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  /** Sidebar active (Figma: light blue block + left bar) */
  navActiveBg: '#EEF2FF',
  navActiveBar: '#4A5CFF',

  /** Status chips (Homework p.2) */
  status: {
    todo: '#1A1D26',
    overdue: '#EF4444',
    revision: '#FBBF24',
    review: '#0EA5E9',
    graded: '#10B981',
    ron: '#A78BFA',
  },

  /** Radii */
  radiusCard: '12px',
  radiusPill: '9999px',
  radiusBtn: '12px',

  /** Layout */
  sidebarWidth: '92px',
  contentMax: '1200px',
  headerH: '64px',
} as const;

export type DesignTokens = typeof design;

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
  /** Figma Russian practice — headers, active pills, matching letters */
  russianPurple: '#5C38A3',
  russianPurpleGradFrom: '#8767CA',
  russianPurpleGradTo: '#5C38A3',
  historyOrange: '#D3412E',
  historyOrangeAlt: '#EF6C35',
  russianBorder: '#5C38A3',

  /** Neutrals */
  ink: '#0E1829',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  /** Figma stroke on practice cards / cells / pagination */
  stroke: '#98A1B0',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  /** Sidebar active (Figma: light blue block + left bar) */
  navActiveBg: '#EEF2FF',
  navActiveBar: '#4A5CFF',

  /**
   * Status chips (Homework pdf-page-02) — sampled from Figma export.
   * Count boxes are 16×16 rounded squares; labels stay dark when inactive.
   */
  status: {
    todo: '#0D1728',
    todoCountActive: '#5C49FE',
    overdue: '#FC2504',
    revision: '#F3F210',
    review: '#3433B0',
    graded: '#31D430',
    ron: '#DCDEE6',
    ronText: '#3433B0',
  },

  /** Radii — Figma Inspect */
  radiusCard: '16px',
  radiusPill: '9999px',
  radiusBtn: '10px',
  radiusCount: '3px',
  /** Small controls: pagination, matching cells */
  radiusSm: '3px',

  /** Practice matching grid — Figma Group 102/103 */
  matchCell: {
    w: 42,
    letterH: 36,
    inputH: 36,
    radius: 3,
    stroke: '#98A1B0',
    strokeW: 0.5,
  },

  /** Practice pagination square — Figma Rectangle 198/201 */
  practiceNav: {
    size: 21,
    radius: 3,
    stroke: '#98A1B0',
    strokeW: 0.5,
    fontSize: 10.85,
  },

  /** Homework card — Figma Group 33 */
  hwCard: {
    w: 324,
    h: 149,
    radius: 18,
    titleFont: 'Merriweather Sans',
    titleSize: 14.98,
    titleWeight: 800,
    titleColor: '#0E1829',
  },

  /** Status chip row (Group 31): 680×24 */
  hwChipH: 24,

  /** Schedule event card — Figma Groups 15–18 */
  schedCard: {
    w: 327,
    h: 100,
    radius: 5,
    borderW: 0.5,
    padX: 10,
    padY: 8,
  },

  /** Schedule calendar cell — Rectangle 185 */
  schedCell: {
    w: 175,
    h: 95,
    radius: 9,
    selectedBorder: '#5C38A3',
  },

  /** Theory lesson column — Figma ~778px content, 829px shell */
  theoryCol: 829,
  theoryBlock: 778,
  theoryCover: { w: 202, h: 288, radius: 4.34 },
  theoryBtn: { w: 156, wWide: 183, h: 26, radius: 3 },
  theorySectionTitle: { size: 16.69, weight: 800, lineHeight: 1.41 },
  theoryBody: { size: 10.85, weight: 400, lineHeight: 1.2 },
  theoryTextCol: 542,
  theoryVideoLarge: { w: 778.06, h: 408.28, radius: 8.97 },
  theoryVideoHalf: { w: 381, h: 200, radius: 8.97 },
  theoryVideoGap: 16,

  /** Layout */
  sidebarWidth: '92px',
  contentMax: '100%',
  /** Sidebar → content (Figma ~42px @ 1440) */
  contentGutter: 'clamp(1rem, 2.9vw, 2.625rem)',
  headerH: '64px',
} as const;

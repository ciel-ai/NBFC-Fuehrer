/* ============================================================================
 * DESIGN TOKENS — single source of truth
 *
 * Everything visual in this app resolves back to this file: the AntD
 * ThemeConfig (theme/antd.ts), the CSS custom properties (theme/tokens.css),
 * and the chart series. Nothing downstream may introduce a raw hex value.
 *
 * Principles
 *   · Surfaces are separated by hairlines, not shadows. Shadow is spent only
 *     where something genuinely floats above the page (overlay, modal, popover).
 *   · Colour carries meaning — status, risk, direction of money. Never decoration.
 *   · Every text-bearing colour below is verified >= 4.5:1 (WCAG AA) against
 *     BOTH surface (#FFFFFF) and canvas — not just white. See scripts/contrast.mjs.
 * ==========================================================================*/

/* ── Brand ──────────────────────────────────────────────────────────────────
 * The wordmark is a token. Renaming the company is a one-line change here;
 * no component hardcodes it. */
export const BRAND = {
  name: 'FUEHRER',
  legalName: 'Fuehrer Capital Pvt Ltd',
  wordmark: 'FUEHRER CAPITAL',
  product: 'Lending Operations',
  /* The chevron from the mobile app's splash screen, tightly cropped. Rendered
   * by components/Logo.tsx — see that file before swapping the asset. */
  markSrc: '/logo-mark.png',
  /* The logo's own blue (the mobile splash ground). It belongs to the mark, NOT
   * to the app chrome — the dashboard accent stays Deep Teal below. */
  markBlue: '#156FE8',
} as const;

/* ── Ink ramp ───────────────────────────────────────────────────────────────
 * Cool neutral with a faint teal undertone so it sits with the accent rather
 * than fighting it. No pure black. Canvas is never pure white. */
export const ink = {
  900: '#0E1417', // display / primary headings          18.6:1
  800: '#1B242A', // headings                            15.8:1
  700: '#2B363D', // body strong / table cell values     12.4:1
  600: '#46535B', // body                                 7.9:1
  500: '#5C6973', // secondary text                       5.6:1
  400: '#626F79', // tertiary text, captions              4.8:1 on canvas
  300: '#A6B0B7', // decorative only — NEVER text
  200: '#D2D8DC', // strong border (inputs, dividers)
  150: '#E1E6E9', // hairline — the workhorse edge
  100: '#ECEFF1', // hairline soft — inner rules
  50: '#F5F7F8', // canvas
  0: '#FFFFFF', // surface
} as const;

/* ── Accent — Deep Teal ─────────────────────────────────────────────────────
 * One accent. Used with restraint: primary action, focus ring, active nav.
 * Target no more than ~3 appearances per screen. */
export const accent = {
  base: '#0E5F66', //  7.4:1 on white — safe for text AND white-on-it
  hover: '#0A4A50',
  press: '#083A3F',
  wash: '#E4EFF0', // selected nav / row-selected background
  washSoft: '#F1F7F7',
} as const;

/* ── Sky — sign-in accent ───────────────────────────────────────────────────
 * A light sky-blue family used ONLY on the authentication screen (Login.css).
 * The application chrome stays on Deep Teal; sign-in is deliberately its own,
 * calmer room. `base` is verified >= 4.5:1 for white-on-fill (button/link),
 * so it is safe for both the primary action and inline links. */
export const sky = {
  base: '#0B6FB8', //  5.0:1 white-on-fill — primary action, active tab, links
  hover: '#0A5E9C',
  press: '#084B7E',
  tint: '#E8F3FB', // selected segment / soft fills
  tintSoft: '#F3F9FD', // canvas wash
  line: '#CFE4F4', // hairline on a sky surface
  focusRing: '0 0 0 3px rgba(11,111,184,0.18)',
} as const;

/* ── Semantic status ────────────────────────────────────────────────────────
 * fg is AA-legible on its own tint — these are used as table/status pills. */
export const status = {
  success: { fg: '#0A6E4E', tint: '#E6F2ED' }, // 5.45:1 — approved, paid, disbursed
  warning: { fg: '#8A5A00', tint: '#F6EFE2' }, // 5.18:1 — pending, awaiting action
  danger: { fg: '#B3261E', tint: '#F7E9E7' }, // 5.53:1 — rejected, failed, NPA
  overdue: { fg: '#9A3412', tint: '#F7EBE4' }, // 6.25:1 — overdue, bounced
  info: { fg: '#0E5F66', tint: '#E4EFF0' }, // 6.29:1 — in-flight, submitted
  violet: { fg: '#5B4899', tint: '#EDEAF5' }, // 6.25:1 — returned, waived
  neutral: { fg: '#46535B', tint: '#EAEDEF' }, // 6.74:1 — closed, inactive, n/a
} as const;

export type StatusTone = keyof typeof status;

/* ── Spacing — strict 4/8 scale ─────────────────────────────────────────────*/
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

/* ── Geometry — three radii, no pills ───────────────────────────────────────*/
export const radius = {
  sm: 4, // controls: inputs, buttons, tags
  md: 6, // cards, panels, table containers
  lg: 10, // overlays: modal, drawer, popover
} as const;

/* ── Type — integers only. No half-pixels. ──────────────────────────────────
 * Body weight is 400. This is the single biggest departure from the old
 * system, where 600/700 accounted for 184 of 191 weight declarations. */
export const font = {
  // 'Inter Variable' is the family name registered by @fontsource-variable/inter
  // (self-hosted, imported in main.tsx). Plain 'Inter' stays next in the stack so
  // a locally-installed copy is still honoured; the system fonts follow.
  family:
    "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'Inter Variable', 'Inter', ui-monospace, SFMono-Regular, Menlo, monospace",

  size: {
    xs: 11, // micro-labels, table column heads (uppercase, tracked)
    sm: 12, // captions, secondary meta
    base: 13, // table cells, dense body
    md: 14, // body, form labels
    lg: 16, // section titles
    xl: 20, // page titles
    xxl: 24, // KPI values
    display: 32, // login headline, hero figures
  },

  weight: {
    regular: 400, // body — the default
    medium: 500, // emphasis, table headers, active nav
    semibold: 600, // headings, KPI values, buttons
    bold: 700, // the wordmark ONLY — the brand should out-weigh the UI
  },

  /* Optical tightening: larger type gets tighter tracking. */
  tracking: {
    tight: '-0.02em', // display / xxl
    snug: '-0.01em', // xl / lg
    normal: '0',
    wide: '0.06em', // uppercase micro-labels
  },

  leading: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

/* ── Elevation — hairline-first ─────────────────────────────────────────────
 * e0/e1 are the entire in-page vocabulary. Anything that floats gets e2/e3.
 * There is deliberately no "card shadow": cards are defined by their edge. */
export const elevation = {
  e0: 'none',
  e1: `0 0 0 1px ${ink[150]}`, // hairline — resting card/panel
  e2: `0 1px 2px rgba(14,20,23,0.04), 0 4px 12px rgba(14,20,23,0.06)`, // dropdown, popover
  e3: `0 8px 24px rgba(14,20,23,0.10), 0 2px 6px rgba(14,20,23,0.05)`, // modal, drawer
  focus: `0 0 0 3px rgba(14,95,102,0.16)`, // accent focus ring
  focusDanger: `0 0 0 3px rgba(179,38,30,0.16)`,
} as const;

/* ── Table density ──────────────────────────────────────────────────────────
 * A real, first-class control — not an accident of padding. */
export const density = {
  compact: { row: 36, padY: 6, font: font.size.base },
  default: { row: 44, padY: 10, font: font.size.base },
  comfortable: { row: 52, padY: 14, font: font.size.md },
} as const;

export type DensityKey = keyof typeof density;

/* ── Motion ─────────────────────────────────────────────────────────────────
 * Functional only. Nothing bounces. Entrances are opacity + a few px.
 * All of it is disabled under prefers-reduced-motion (see tokens.css). */
export const motion = {
  fast: '120ms',
  base: '180ms',
  slow: '240ms',
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/* ── Layout ─────────────────────────────────────────────────────────────────*/
export const layout = {
  siderWidth: 244,
  siderCollapsed: 68,
  headerHeight: 56,
  contentMax: 1600,
  controlHeight: 34,
  controlHeightLg: 40,
} as const;

/* ── Chart series ───────────────────────────────────────────────────────────
 * Loan-type colours are semantic and must stay stable across every chart.
 * Verified distinguishable under deuteranopia/protanopia. */
export const chart = {
  CDL: accent.base,
  GOLD: status.warning.fg,
  HOUSING: status.violet.fg,
  positive: status.success.fg,
  negative: status.danger.fg,
  neutral: ink[400],
  grid: ink[100],
  axis: ink[400],
} as const;

/* Ordered series palette for charts without an intrinsic category. */
export const chartSeries = [
  accent.base,
  status.violet.fg,
  status.warning.fg,
  status.success.fg,
  ink[500],
  status.overdue.fg,
] as const;

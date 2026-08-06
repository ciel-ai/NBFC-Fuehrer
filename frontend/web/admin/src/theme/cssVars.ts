import { BRAND, accent, elevation, font, ink, layout, motion, radius, sky, space, status } from './tokens';

/* ============================================================================
 * CSS custom properties, DERIVED from tokens.ts.
 *
 * The hand-written CSS layer needs the same values the TS layer has. Rather
 * than maintain a parallel list in a .css file — which is exactly how the old
 * system drifted into 114 hex literals — we generate the variables from the
 * tokens and inject them once, synchronously, before first paint.
 *
 * Consequence: a CSS rule can only ever use a colour that exists as a token.
 * ==========================================================================*/

const vars: Record<string, string | number> = {
  /* ink */
  ...Object.fromEntries(Object.entries(ink).map(([k, v]) => [`--ink-${k}`, v])),

  /* accent */
  '--accent': accent.base,
  '--accent-hover': accent.hover,
  '--accent-press': accent.press,
  '--accent-wash': accent.wash,
  '--accent-wash-soft': accent.washSoft,

  /* brand — the logo's own blue. Used ONLY as a ground behind the mark
   * (components/Logo.tsx). Never as UI accent — that stays Deep Teal. */
  '--brand-mark-blue': BRAND.markBlue,

  /* sky — sign-in accent (used only by Login.css) */
  '--sky': sky.base,
  '--sky-hover': sky.hover,
  '--sky-press': sky.press,
  '--sky-tint': sky.tint,
  '--sky-tint-soft': sky.tintSoft,
  '--sky-line': sky.line,
  '--sky-focus-ring': sky.focusRing,

  /* semantic status — fg + tint pairs */
  ...Object.fromEntries(
    Object.entries(status).flatMap(([k, v]) => [
      [`--status-${k}-fg`, v.fg],
      [`--status-${k}-tint`, v.tint],
    ]),
  ),

  /* spacing */
  ...Object.fromEntries(Object.entries(space).map(([k, v]) => [`--space-${k}`, `${v}px`])),

  /* radius */
  '--radius-sm': `${radius.sm}px`,
  '--radius-md': `${radius.md}px`,
  '--radius-lg': `${radius.lg}px`,

  /* type */
  '--font-family': font.family,
  ...Object.fromEntries(Object.entries(font.size).map(([k, v]) => [`--text-${k}`, `${v}px`])),
  ...Object.fromEntries(Object.entries(font.weight).map(([k, v]) => [`--weight-${k}`, v])),
  ...Object.fromEntries(Object.entries(font.tracking).map(([k, v]) => [`--tracking-${k}`, v])),
  ...Object.fromEntries(Object.entries(font.leading).map(([k, v]) => [`--leading-${k}`, v])),

  /* elevation */
  '--e0': elevation.e0,
  '--e1': elevation.e1,
  '--e2': elevation.e2,
  '--e3': elevation.e3,
  '--focus-ring': elevation.focus,

  /* motion */
  '--motion-fast': motion.fast,
  '--motion-base': motion.base,
  '--motion-slow': motion.slow,
  '--ease': motion.ease,
  '--ease-out': motion.easeOut,

  /* layout */
  '--sider-w': `${layout.siderWidth}px`,
  '--sider-collapsed-w': `${layout.siderCollapsed}px`,
  '--header-h': `${layout.headerHeight}px`,
  '--content-max': `${layout.contentMax}px`,
};

export const cssVariableBlock = `:root{${Object.entries(vars)
  .map(([k, v]) => `${k}:${v}`)
  .join(';')}}`;

/**
 * Injects the token variables into <head>. Called synchronously from main.tsx
 * before render, so there is no flash of unstyled/untokenised content.
 */
export function installTokens(): void {
  const el = document.createElement('style');
  el.setAttribute('data-fc-tokens', '');
  el.textContent = cssVariableBlock;
  document.head.prepend(el);
}

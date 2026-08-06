import React from 'react';

/* ============================================================================
 * State icons.
 *
 * Line art, drawn on the same 1.5px hairline as the rest of the interface, in
 * currentColor so they inherit their state's tone. Deliberately NOT the
 * "illustration inside a tinted circle" convention — that reads as a stock
 * empty-state and is the exact cliché this rebuild is removing.
 * ==========================================================================*/

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Zero results — an empty ruled ledger page. */
export const LedgerEmpty: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <rect x="8.75" y="4.75" width="22.5" height="30.5" rx="2" {...stroke} />
    <path d="M14 13h12M14 20h12M14 27h7" {...stroke} opacity="0.45" />
  </svg>
);

/** Fetch failed — a severed connection. */
export const ConnectionLost: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M20 6v6M20 28v6M6 20h6M28 20h6" {...stroke} opacity="0.45" />
    <circle cx="20" cy="20" r="7.25" {...stroke} />
    <path d="M14.9 25.1 25.1 14.9" {...stroke} />
  </svg>
);

/** Nothing assigned to you — a cleared worklist. */
export const QueueClear: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <path d="M6.75 12.75h26.5v18.5a2 2 0 0 1-2 2h-22.5a2 2 0 0 1-2-2z" {...stroke} />
    <path d="M6.75 12.75 10 6.75h20l3.25 6" {...stroke} />
    <path d="M14 19.5l4.5 4.5 8-8" {...stroke} />
  </svg>
);

/** No search matches — a lens over a ruled line, nothing found. */
export const SearchEmpty: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="17.5" cy="17.5" r="9.25" {...stroke} />
    <path d="M24.5 24.5 33 33" {...stroke} />
    <path d="M13.5 17.5h8" {...stroke} opacity="0.45" />
  </svg>
);

/** Completed — a checkmark sealed in a ring. Used by the success state. */
export const CheckSeal: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="13.25" {...stroke} />
    <path d="m14.25 20.5 4 4 7.5-8.5" {...stroke} />
  </svg>
);

/* Backwards-compatible aliases for the previous icon names. */
export const InboxIcon = LedgerEmpty;
export const CloudOffline = ConnectionLost;

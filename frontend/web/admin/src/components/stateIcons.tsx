// src/components/stateIcons.tsx
//
// Soft illustrative icons for the shared state views — kept as inline SVG so
// they inherit no external assets and stay consistent with the Ice Blue theme.

import React from 'react';

export const CloudOffline: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="#f4f6fb" />
    <path
      d="M20 38a8 8 0 0 1 1.2-15.9A11 11 0 0 1 42.5 24 7.5 7.5 0 0 1 44 38.8"
      stroke="#a8bdd6" strokeWidth="2.6" strokeLinecap="round" fill="#fff"
    />
    <path d="M24 44l16-16" stroke="#f0506e" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M24 28l16 16" stroke="#f0506e" strokeWidth="2.6" strokeLinecap="round" opacity="0.35" />
  </svg>
);

export const InboxIcon: React.FC = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <circle cx="28" cy="28" r="26" fill="#f4f6fb" />
    <path
      d="M15 30l4.5-11a2 2 0 0 1 1.9-1.3h13.2a2 2 0 0 1 1.9 1.3L41 30v7a2 2 0 0 1-2 2H17a2 2 0 0 1-2-2v-7z"
      fill="#fff" stroke="#a8bdd6" strokeWidth="2.4" strokeLinejoin="round"
    />
    <path d="M15 30h7.5a3 3 0 0 0 6 0H41" stroke="#a8bdd6" strokeWidth="2.4" strokeLinejoin="round" />
  </svg>
);

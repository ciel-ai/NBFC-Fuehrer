// Shared UI design system and color tokens.
// Avoid putting platform-specific UI rendering components here.

export const designTokens = {
  colors: {
    primary: '#2456e6',
    primaryDark: '#0f2c4f',
    gold: '#b26a00',
    housing: '#6d4ea8',
    success: '#1d7a46',
    danger: '#ef4444',
    background: '#f8fafc',
    card: '#ffffff',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
} as const;

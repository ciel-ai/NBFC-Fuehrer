export const Colors = {
  primary: '#1A56DB',
  primaryDark: '#1340B0',
  primaryLight: '#EBF2FF',
  navy: '#1E3A8A',
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  goldDark: '#D97706',

  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',

  background: '#FFFFFF',
  backgroundLight: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  disabled: '#D1D5DB',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textWhite: '#FFFFFF',

  cardBackground: '#EBF2FF',
  navyDark: '#1E3A8A',

  comingSoonBg: '#FEF3C7',
  comingSoonText: '#D97706',
  comingSoonBorder: '#FCD34D',

  tabBarActive: '#1A56DB',
  tabBarInactive: '#9CA3AF',

  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  teal: '#0D9488',
  tealLight: '#CCFBF1',
  googleBlue: '#1A73E8',
  googleBlueLight: '#E8F0FE',
  successEmphasis: '#F0FDF4',
} as const;

export type ColorKey = keyof typeof Colors;

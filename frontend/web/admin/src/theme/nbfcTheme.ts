import type { ThemeConfig } from 'antd';

// ---- Design tokens: "Ice Blue" NBFC theme ----
export const nbfcColors = {
  page: '#E9EBEF',
  card: '#FFFFFF',
  ink: '#15181D',
  inkSoft: '#8A8F98',
  accent: '#5AA9E6',
  accentSoft: '#DCEEFB',
  accentDeep: '#3C86C4',
  darkPill: '#1B1D22',
  green: '#2FBE7A',
  greenSoft: '#DFF6EA',
  red: '#F0506E',
  redSoft: '#FDE3E8',
} as const;

export const nbfcTheme: ThemeConfig = {
  token: {
    colorPrimary: nbfcColors.accentDeep,
    colorBgLayout: nbfcColors.page,
    colorBgContainer: nbfcColors.card,
    colorText: nbfcColors.ink,
    colorTextSecondary: nbfcColors.inkSoft,
    colorSuccess: nbfcColors.green,
    colorError: nbfcColors.red,
    borderRadius: 16,
    borderRadiusLG: 24,
    fontFamily:
      "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13.5,
  },
  components: {
    Card: {
      borderRadiusLG: 24,
      paddingLG: 22,
      boxShadowTertiary: 'none',
    },
    Button: {
      borderRadius: 24,
      controlHeight: 40,
      fontWeight: 600,
    },
    Menu: {
      itemBorderRadius: 10,
      itemSelectedBg: 'rgba(90,169,230,0.18)',
      itemSelectedColor: '#FFFFFF',
      darkItemBg: 'transparent',
    },
    Statistic: {
      titleFontSize: 12.5,
      contentFontSize: 26,
    },
    Table: {
      headerBg: 'transparent',
      borderColor: '#F0F2F5',
    },
    Progress: {
      defaultColor: nbfcColors.accent,
    },
  },
};

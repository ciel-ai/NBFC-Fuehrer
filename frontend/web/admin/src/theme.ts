import type { ThemeConfig } from 'antd';

/* ============================================================================
 * FUEHRER NBFC — Design tokens
 * Institutional lending back-office: cool-grey neutrals carry the interface,
 * a single disciplined navy-blue accent, hairline borders and a restrained,
 * flat elevation scale. Colour is reserved for meaning, never decoration.
 * ==========================================================================*/

export const BRAND = {
  name: 'FUEHRER NBFC',
  product: 'Lending Operations Suite',

  // Brand / primary — bright royal blue (the floating-panel design language)
  primary: '#0284c7',
  primaryDark: '#0369a1',
  primaryDeep: '#075985',
  primarySoft: '#e0f2fe', // selected / hover wash
  accent: '#38bdf8', // lighter blue, used sparingly
  violet: '#6d4ea8',

  // Navigation surface (light, hairline-defined)
  sidebarBg: '#ffffff',
  sidebarTint: '#fafbfc',
  sidebarBorder: '#e6e9ef',
  sidebarBgEnd: '#0f2c4f', // kept for the login hero

  // Status — deepened, serious, not candy-bright
  success: '#1d7a46',
  warning: '#b26a00',
  error: '#c0392b',
  info: '#0284c7',

  // Text — cool near-black ink → muted slate
  textHead: '#10202f',
  textBody: '#4a5663',
  textMuted: '#6b7280',

  // Lines & surfaces
  border: '#e4e8ee',
  borderSoft: '#eef1f5',
  pageBg: '#f8f9fb',
  surface: '#ffffff',
} as const;

/* Flat, restrained elevation — institutional UIs lean on borders, not shadow */
export const ELEVATION = {
  xs: '0 1px 1px rgba(16, 32, 47, 0.04)',
  sm: '0 1px 2px rgba(16, 32, 47, 0.05)',
  md: '0 1px 2px rgba(16,32,47,0.04), 0 4px 12px rgba(16,32,47,0.06)',
  lg: '0 4px 10px rgba(16,32,47,0.06), 0 16px 36px rgba(16,32,47,0.10)',
  primary: '0 2px 6px rgba(15, 44, 79, 0.22)',
} as const;

export const antdTheme: ThemeConfig = {
  cssVar: { key: 'fuehrer' },
  token: {
    colorPrimary: BRAND.primary,
    colorSuccess: BRAND.success,
    colorWarning: BRAND.warning,
    colorError: BRAND.error,
    colorInfo: BRAND.info,

    colorTextBase: BRAND.textHead,
    colorText: '#1f2a36',
    colorTextSecondary: BRAND.textBody,
    colorTextTertiary: BRAND.textMuted,

    colorBgLayout: BRAND.pageBg,
    colorBgContainer: '#ffffff',
    colorBorder: '#d8dee7',
    colorBorderSecondary: BRAND.border,

    // Sharper, institutional geometry
    borderRadius: 10,
    borderRadiusSM: 8,
    borderRadiusLG: 16,

    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 13.5,
    lineHeight: 1.5715,
    controlHeight: 36,

    boxShadow: ELEVATION.sm,
    boxShadowSecondary: ELEVATION.md,
    boxShadowTertiary: ELEVATION.xs,

    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'rgba(255,255,255,0.88)',
      headerHeight: 60,
      siderBg: BRAND.sidebarBg,
      bodyBg: BRAND.pageBg,
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: '#5a6675',
      itemHoverColor: BRAND.primary,
      itemHoverBg: '#f1f4f8',
      itemSelectedColor: BRAND.primary,
      itemSelectedBg: BRAND.primarySoft,
      itemActiveBg: BRAND.primarySoft,
      groupTitleColor: '#9aa6b4',
      itemMarginInline: 8,
      itemMarginBlock: 2,
      itemBorderRadius: 10,
      itemHeight: 40,
      fontSize: 13.5,
      iconSize: 16,
      collapsedIconSize: 17,
    },
    Card: {
      paddingLG: 20,
      boxShadowTertiary: ELEVATION.xs,
      colorBorderSecondary: BRAND.border,
      borderRadiusLG: 16,
    },
    Table: {
      headerBg: 'transparent',
      headerColor: '#6b7785',
      headerSplitColor: 'transparent',
      headerBorderRadius: 8,
      fontSize: 13,
      cellPaddingBlock: 15,
      rowHoverBg: '#f3f7fb',
      borderColor: '#eef1f5',
    },
    Tabs: {
      titleFontSize: 13.5,
      horizontalItemGutter: 26,
      inkBarColor: BRAND.primary,
      itemSelectedColor: BRAND.primary,
      itemHoverColor: BRAND.primaryDark,
    },
    Button: {
      fontWeight: 600,
      primaryShadow: 'none',
      defaultShadow: 'none',
      controlHeight: 36,
      controlHeightLG: 42,
      borderRadius: 8,
    },
    Input: {
      controlHeight: 36,
      controlHeightLG: 44,
      activeShadow: '0 0 0 3px rgba(2, 132, 199, 0.14)',
      paddingInline: 12,
      borderRadius: 8,
    },
    Select: {
      controlHeight: 36,
      borderRadius: 8,
      optionSelectedBg: BRAND.primarySoft,
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: BRAND.primary,
      trackBg: '#eceff4',
      borderRadius: 8,
      controlHeight: 40,
    },
    Tag: { fontSizeSM: 11, borderRadiusSM: 5 },
    Descriptions: { titleMarginBottom: 12, itemPaddingBottom: 10 },
    Drawer: { footerPaddingBlock: 16 },
    Statistic: { contentFontSize: 28 },
    Avatar: { borderRadius: 8 },
    Tooltip: { colorBgSpotlight: '#10202f', borderRadius: 7 },
    Modal: { borderRadiusLG: 16 },
    Popover: { borderRadiusLG: 10 },
    Badge: { dotSize: 8 },
  },
};

/** Loan-type series colors used across all charts — restrained, distinct */
export const CHART_COLORS = {
  CDL: '#0284c7',
  GOLD: '#b26a00',
  HOUSING: '#6d4ea8',
  green: '#1d7a46',
  red: '#c0392b',
  cyan: '#2563a8',
  slate: '#64748b',
  grid: '#eceff3',
};

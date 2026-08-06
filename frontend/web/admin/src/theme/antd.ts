import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import { accent, elevation, font, ink, layout, radius, space, status } from './tokens';

/* ============================================================================
 * AntD v6 ThemeConfig — derived from tokens.ts. No literal values here.
 *
 * cssVar is on, so AntD emits CSS custom properties under the `fc` key. The
 * hand-written CSS layer (tokens.css) reads OUR variables; AntD components read
 * AntD's. Both are generated from the same tokens, so they cannot drift.
 *
 * Component overrides below exist to do one of three things:
 *   1. Kill a default AntD shadow and replace it with a hairline.
 *   2. Reassert the type scale (AntD derives sizes we don't want).
 *   3. Push density down to what a lending back-office actually needs.
 * ==========================================================================*/

export const theme: ThemeConfig = {
  cssVar: { key: 'fc' },
  algorithm: antdTheme.defaultAlgorithm,
  hashed: false,

  token: {
    /* colour */
    colorPrimary: accent.base,
    colorSuccess: status.success.fg,
    colorWarning: status.warning.fg,
    colorError: status.danger.fg,
    colorInfo: accent.base,
    colorLink: accent.base,
    colorLinkHover: accent.hover,

    /* AntD derives Alert/Tag/message backgrounds from the status colours. Ours are
       deliberately dark (they must pass AA as TEXT), so the auto-derived tints come
       out muddy. Hand them the real tints instead. */
    colorSuccessBg: status.success.tint,
    colorSuccessBorder: status.success.tint,
    colorWarningBg: status.warning.tint,
    colorWarningBorder: status.warning.tint,
    colorErrorBg: status.danger.tint,
    colorErrorBorder: status.danger.tint,
    colorInfoBg: accent.wash,
    colorInfoBorder: accent.wash,

    colorTextBase: ink[900],
    colorText: ink[700],
    colorTextSecondary: ink[500],
    colorTextTertiary: ink[400],
    colorTextQuaternary: ink[300],
    colorTextDescription: ink[500],
    colorTextPlaceholder: ink[400],
    colorTextDisabled: ink[300],

    colorBgLayout: ink[50],
    colorBgContainer: ink[0],
    colorBgElevated: ink[0],
    colorBgSpotlight: ink[800],
    colorFillTertiary: ink[50],
    colorFillQuaternary: ink[50],

    colorBorder: ink[200],
    colorBorderSecondary: ink[150],
    colorSplit: ink[100],

    /* geometry */
    borderRadius: radius.sm,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.md,
    borderRadiusXS: radius.sm,
    lineWidth: 1,

    /* type */
    fontFamily: font.family,
    fontSize: font.size.base,
    fontSizeSM: font.size.sm,
    fontSizeLG: font.size.md,
    fontSizeXL: font.size.lg,
    fontSizeHeading1: font.size.display,
    fontSizeHeading2: font.size.xxl,
    fontSizeHeading3: font.size.xl,
    fontSizeHeading4: font.size.lg,
    fontSizeHeading5: font.size.md,
    fontWeightStrong: font.weight.semibold,
    lineHeight: font.leading.normal,

    /* elevation — AntD's presets are replaced wholesale */
    boxShadow: elevation.e2,
    boxShadowSecondary: elevation.e3,
    boxShadowTertiary: elevation.e1,

    /* controls */
    controlHeight: layout.controlHeight,
    controlHeightLG: layout.controlHeightLg,
    controlHeightSM: 28,
    controlOutlineWidth: 3,
    controlOutline: 'rgba(14,95,102,0.16)',

    /* spacing */
    padding: space[4],
    paddingLG: space[5],
    paddingSM: space[3],
    paddingXS: space[2],
    margin: space[4],
    marginLG: space[5],
    marginSM: space[3],
    marginXS: space[2],

    wireframe: false,
  },

  components: {
    /* ── Shell ─────────────────────────────────────────────────────────── */
    Layout: {
      headerBg: ink[0],
      headerHeight: layout.headerHeight,
      headerPadding: `0 ${space[5]}px`,
      siderBg: ink[0],
      bodyBg: ink[50],
      triggerBg: ink[0],
      triggerColor: ink[500],
    },

    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: ink[600],
      itemHoverColor: ink[900],
      itemHoverBg: ink[50],
      itemSelectedColor: accent.base,
      itemSelectedBg: accent.wash,
      itemActiveBg: accent.wash,
      groupTitleColor: ink[400],
      groupTitleFontSize: font.size.xs,
      itemBorderRadius: radius.sm,
      itemMarginInline: space[2],
      itemMarginBlock: 1,
      itemHeight: 34,
      itemPaddingInline: space[2],
      fontSize: font.size.base,
      iconSize: 16,
      collapsedIconSize: 16,
      activeBarWidth: 0,
      activeBarBorderWidth: 0,
    },

    /* ── Surfaces ──────────────────────────────────────────────────────── */
    Card: {
      /* The defining move: no shadow. A card is a hairline. */
      boxShadowTertiary: elevation.e0,
      colorBorderSecondary: ink[150],
      borderRadiusLG: radius.md,
      paddingLG: space[5],
      headerHeight: 44,
      headerFontSize: font.size.md,
      headerBg: 'transparent',
    },

    Modal: {
      borderRadiusLG: radius.lg,
      boxShadow: elevation.e3,
      titleFontSize: font.size.lg,
      headerBg: 'transparent',
      contentBg: ink[0],
      padding: space[5],
    },

    Drawer: {
      footerPaddingBlock: space[4],
      footerPaddingInline: space[5],
      paddingLG: space[5],
    },

    Popover: { borderRadiusLG: radius.md, boxShadowSecondary: elevation.e2 },
    Dropdown: {
      borderRadiusLG: radius.md,
      boxShadowSecondary: elevation.e2,
      controlItemBgHover: ink[50],
    },

    Tooltip: {
      colorBgSpotlight: ink[800],
      borderRadius: radius.sm,
      fontSize: font.size.sm,
      boxShadowSecondary: elevation.e2,
    },

    /* ── Data ──────────────────────────────────────────────────────────── */
    Table: {
      /* Dense but calm. Header is a quiet rule, not a grey slab. */
      headerBg: 'transparent',
      headerColor: ink[400],
      headerSplitColor: 'transparent',
      headerBorderRadius: 0,
      borderColor: ink[100],
      rowHoverBg: ink[50],
      rowSelectedBg: accent.wash,
      rowSelectedHoverBg: accent.wash,
      cellPaddingBlock: space[3],
      cellPaddingInline: space[4],
      cellPaddingBlockMD: space[2],
      cellPaddingBlockSM: space[1],
      fontSize: font.size.base,
      footerBg: 'transparent',
      stickyScrollBarBg: ink[200],
      expandIconBg: 'transparent',
    },

    Pagination: { itemActiveBg: accent.wash, itemSize: 30, borderRadius: radius.sm },

    Statistic: {
      contentFontSize: font.size.xxl,
      titleFontSize: font.size.sm,
      colorTextDescription: ink[400],
    },

    Descriptions: {
      titleMarginBottom: space[3],
      itemPaddingBottom: space[3],
      labelBg: 'transparent',
      colorTextSecondary: ink[400],
    },

    /* ── Controls ──────────────────────────────────────────────────────── */
    Button: {
      fontWeight: font.weight.medium,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      borderRadius: radius.sm,
      controlHeight: layout.controlHeight,
      controlHeightLG: layout.controlHeightLg,
      defaultBorderColor: ink[200],
      defaultColor: ink[700],
      defaultHoverBorderColor: ink[400],
      defaultHoverColor: ink[900],
      defaultHoverBg: ink[50],
      paddingInline: space[3],
      contentFontSize: font.size.base,
    },

    Input: {
      controlHeight: layout.controlHeight,
      controlHeightLG: layout.controlHeightLg,
      activeShadow: elevation.focus,
      errorActiveShadow: elevation.focusDanger,
      borderRadius: radius.sm,
      paddingInline: space[3],
      colorBorder: ink[200],
      hoverBorderColor: ink[400],
      activeBorderColor: accent.base,
      addonBg: ink[50],
    },

    InputNumber: {
      controlHeight: layout.controlHeight,
      borderRadius: radius.sm,
      activeShadow: elevation.focus,
      colorBorder: ink[200],
      activeBorderColor: accent.base,
    },

    Select: {
      controlHeight: layout.controlHeight,
      borderRadius: radius.sm,
      optionSelectedBg: accent.wash,
      optionSelectedColor: accent.base,
      optionSelectedFontWeight: font.weight.medium,
      colorBorder: ink[200],
      hoverBorderColor: ink[400],
      activeBorderColor: accent.base,
      activeOutlineColor: 'rgba(14,95,102,0.16)',
      optionPadding: `${space[1]}px ${space[3]}px`,
    },

    DatePicker: {
      controlHeight: layout.controlHeight,
      borderRadius: radius.sm,
      activeShadow: elevation.focus,
      colorBorder: ink[200],
      activeBorderColor: accent.base,
      cellActiveWithRangeBg: accent.wash,
    },

    Checkbox: { borderRadiusSM: 3, controlInteractiveSize: 15 },
    Radio: { buttonBg: 'transparent', buttonCheckedBg: accent.wash, borderRadius: radius.sm },
    Switch: { trackMinWidth: 38, trackHeight: 20, handleSize: 16 },

    Segmented: {
      /* The density switcher lives here — it must read as a control, not a toy. */
      itemSelectedBg: ink[0],
      itemSelectedColor: ink[900],
      itemColor: ink[500],
      itemHoverColor: ink[900],
      trackBg: ink[100],
      borderRadius: radius.sm,
      controlHeight: layout.controlHeight,
      trackPadding: 2,
      fontSize: font.size.sm,
    },

    Tabs: {
      titleFontSize: font.size.md,
      horizontalItemGutter: space[5],
      horizontalItemPadding: `${space[3]}px 0`,
      inkBarColor: accent.base,
      itemSelectedColor: ink[900],
      itemHoverColor: ink[900],
      itemColor: ink[500],
      cardBg: ink[50],
    },

    /* ── Signals ───────────────────────────────────────────────────────── */
    Tag: {
      /* Tags are status pills; StatusTag drives the colour, this sets the shape. */
      borderRadiusSM: radius.sm,
      fontSizeSM: font.size.xs,
      defaultBg: ink[100],
      defaultColor: ink[600],
      lineHeightSM: 1.6,
    },

    Badge: { dotSize: 6, textFontSizeSM: font.size.xs, statusSize: 6 },
    Alert: { borderRadiusLG: radius.md, withDescriptionPadding: `${space[3]}px ${space[4]}px` },
    Progress: { defaultColor: accent.base, remainingColor: ink[100], lineBorderRadius: 2 },
    Avatar: { borderRadius: radius.sm, groupOverlapping: -6 },
    Divider: { colorSplit: ink[150], marginLG: space[5] },
    Skeleton: { borderRadiusSM: radius.sm, gradientFromColor: ink[100], gradientToColor: ink[50] },
    Empty: { colorTextDescription: ink[400] },
    Timeline: { dotBg: ink[0], tailColor: ink[150] },
    Steps: { colorSplit: ink[150], iconSize: 26, titleLineHeight: 26 },
    Result: { titleFontSize: font.size.xl, subtitleFontSize: font.size.md },
    Message: { contentBg: ink[0], borderRadiusLG: radius.md },
    Notification: { borderRadiusLG: radius.md },
    Form: {
      labelColor: ink[600],
      labelFontSize: font.size.base,
      itemMarginBottom: space[4],
      verticalLabelPadding: `0 0 ${space[1]}px`,
    },
  },
};

export default theme;

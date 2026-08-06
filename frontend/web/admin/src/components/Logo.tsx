/* ============================================================================
 * LOGO — the FUEHRER mark
 *
 * The mark is the blue chevron the mobile app shows on its splash screen
 * (frontend/mobile/assets — `android-icon-foreground.png`, the launcher
 * foreground). It is copied here tightly cropped as `public/logo-mark.png` so
 * the dashboard and the app are unmistakably the same product.
 *
 * It is a raster asset with a baked gradient, so it does NOT recolour: there is
 * no mono or inverse variant, and nothing here reads the theme tokens. What the
 * component does control is the ground it sits on — `tile="white"` reproduces
 * the splash treatment (mark on a white rounded tile), which is what keeps it
 * legible on the brand blue or any dark chrome.
 * ==========================================================================*/
import { BRAND } from '../theme/tokens';

const MARK_SRC = BRAND.markSrc;

export type LogoTile = 'none' | 'white' | 'brand';

interface LogoMarkProps {
  /** Rendered edge length in px. Default 26 — matches the sider brand tile. */
  size?: number;
  /** Ground behind the mark. `white` is the splash treatment. Default `none`. */
  tile?: LogoTile;
  className?: string;
  /** Set when the mark stands alone with no adjacent wordmark. */
  title?: string;
}

/** The mark alone. Square. */
export function LogoMark({ size = 26, tile = 'none', className, title }: LogoMarkProps) {
  const img = (
    <img
      className="logo__img"
      src={MARK_SRC}
      width={tile === 'none' ? size : Math.round(size * 0.72)}
      height={tile === 'none' ? size : Math.round(size * 0.72)}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );

  /* A caller-supplied class needs an element to land on, and that wrapper is
   * what a flex row would otherwise squeeze — so it carries the shrink guard
   * itself rather than leaving each call site to remember one. */
  if (tile === 'none') {
    return className ? <span className={`logo__wrap ${className}`}>{img}</span> : img;
  }

  return (
    <span
      className={
        className
          ? `logo__tile logo__tile--${tile} ${className}`
          : `logo__tile logo__tile--${tile}`
      }
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.227) }}
    >
      {img}
    </span>
  );
}

interface LogoProps extends LogoMarkProps {
  /** Hide the wordmark (collapsed sider) while keeping the mark. */
  wordmark?: boolean;
  /** Second line under the wordmark, e.g. "Lending Operations". */
  caption?: string;
}

/**
 * Mark + wordmark lockup — the portable version, with no surrounding chrome.
 * The sider composes `LogoMark` into its own `.brand` header instead; use this
 * one anywhere the logo stands on its own (sign-in masthead, print header,
 * empty states).
 */
export function Logo({
  size = 26,
  tile = 'none',
  className,
  wordmark = true,
  caption,
}: LogoProps) {
  return (
    <span className={className ? `logo ${className}` : 'logo'}>
      <LogoMark size={size} tile={tile} title={wordmark ? undefined : BRAND.wordmark} />
      {wordmark && (
        <span className="logo__text truncate">
          <span className="logo__name">{BRAND.wordmark}</span>
          {caption && <span className="logo__product">{caption}</span>}
        </span>
      )}
    </span>
  );
}

export default Logo;

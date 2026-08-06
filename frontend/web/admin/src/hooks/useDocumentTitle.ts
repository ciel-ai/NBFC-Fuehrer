import { useEffect } from 'react';

/** Trailing brand, so a tab reads "Credit Queue · Fuehrer Admin". */
const SUFFIX = 'Fuehrer Admin';

/**
 * Set the document title for the current route (WCAG 2.4.2).
 *
 * This is a single-page app: without it every one of the ~30 routes shows the
 * same static <title> from index.html, so a screen-reader user gets no
 * confirmation that navigation happened, and a browser-history or open-tabs list
 * is a wall of identical entries.
 *
 * Called from <PageHeader />, which every screen already renders with the title
 * it displays — so the tab and the <h1> can never drift apart.
 *
 * Restores the previous title on unmount, which keeps the fallback correct when
 * a screen without a PageHeader (e.g. the login route) takes over.
 *
 * Pass `null` to opt out entirely — the title is left exactly as it is. That is
 * what a second PageHeader on the same page needs; setting it to the brand alone
 * would be worse than leaving the real page title in place.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null) return;

    const previous = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export default useDocumentTitle;

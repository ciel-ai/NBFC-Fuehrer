import React, { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { WarningOutlined } from '@ant-design/icons';
import { BRAND } from '../../theme/tokens';
import { LogoMark } from '../../components/Logo';
import { LEGAL_DOCS, LEGAL_LABEL, LEGAL_ORDER } from './legalContent';
import type { LegalSlug } from './legalContent';
import './Legal.css';

/* ============================================================================
 * Legal policy page — public (no auth), one component for all four documents.
 *
 * Reads :doc from the route, looks up the draft scaffold, and renders it with a
 * standing "pending legal review" banner so a placeholder can never pass for a
 * published policy. Reachable before sign-in (a user may read Privacy first)
 * and linked from both footers.
 * ==========================================================================*/

function isSlug(v: string | undefined): v is LegalSlug {
  return !!v && (LEGAL_ORDER as readonly string[]).includes(v);
}

/** Anchor id from a heading, so the contents list can jump to a section. */
const anchor = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const LegalPage: React.FC = () => {
  const { doc } = useParams<{ doc: string }>();
  const year = useMemo(() => new Date().getFullYear(), []);

  if (!isSlug(doc)) return <Navigate to="/legal/privacy" replace />;
  const content = LEGAL_DOCS[doc];

  return (
    <div className="legal">
      <header className="legal__masthead">
        <div className="legal__bar-inner">
          <Link to="/login" className="legal__wordmark">
            <LogoMark size={30} className="legal__logo" />
            {BRAND.wordmark}
          </Link>
          <Link to="/login" className="legal__back">
            Back to sign-in
          </Link>
        </div>
      </header>

      <main className="legal__main">
        <div className="legal__doc">
          <p className="legal__eyebrow">Legal &middot; {BRAND.name}</p>
          <h1 className="legal__title">{content.title}</h1>
          <p className="legal__summary">{content.summary}</p>

          <div className="legal__draft" role="note">
            <WarningOutlined aria-hidden="true" />
            <span>
              <strong>Draft — pending legal review.</strong> The structure below is final; the
              wording is placeholder and is not legally binding until published by {BRAND.legalName}.
            </span>
          </div>

          <nav className="legal__toc" aria-label="On this page">
            <span className="legal__toc-label">On this page</span>
            <ol>
              {content.sections.map((s) => (
                <li key={s.heading}>
                  <a href={`#${anchor(s.heading)}`}>{s.heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="legal__body">
            {content.sections.map((s, i) => (
              <section key={s.heading} id={anchor(s.heading)} className="legal__section">
                <h2 className="legal__section-title">
                  <span className="legal__section-no">{String(i + 1).padStart(2, '0')}</span>
                  {s.heading}
                </h2>
                {s.body.map((p, j) => (
                  <p key={j} className="legal__section-body">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <nav className="legal__siblings" aria-label="Other policies">
            {LEGAL_ORDER.filter((s) => s !== doc).map((s) => (
              <Link key={s} to={`/legal/${s}`} className="legal__sibling">
                {LEGAL_LABEL[s]}
              </Link>
            ))}
          </nav>
        </div>
      </main>

      <footer className="legal__foot">
        <div className="legal__bar-inner">
          <span>
            &copy; {year} {BRAND.legalName}
          </span>
          <span className="legal__foot-note">Draft policies — not for public distribution</span>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;

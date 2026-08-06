import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import { SENTRY_DSN, USE_MOCK } from './config';
import { installTokens } from './theme/cssVars';
// Self-hosted Inter. It used to arrive via an @import from fonts.googleapis.com
// in index.css, which the production CSP (nginx.conf: style-src/font-src 'self')
// blocks outright — the typeface silently failed to load and the wordmark fell
// back to a synthesised faux-bold. Bundling it means Vite emits the woff2 files
// as ordinary same-origin assets, which 'self' already allows. Variable axis
// 100-900, so every weight the design system uses (400/500/600/700) is covered.
import '@fontsource-variable/inter';
import './index.css';

// Crash reporting — no-op until VITE_SENTRY_DSN is set. A lending back-office
// handles PII, so request bodies and user context are never sent.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: USE_MOCK ? 'mock' : import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.request) delete event.request;
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}

// Design tokens become CSS custom properties before first paint, so the CSS
// layer and the AntD layer are guaranteed to read the same values.
installTokens();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

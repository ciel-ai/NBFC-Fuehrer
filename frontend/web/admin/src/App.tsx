import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App as AntApp, ConfigProvider, Empty } from 'antd';
import { theme } from './theme/antd';
import { useAuthStore } from './store/authStore';
import { useCanAccess } from './auth/permissionStore';
import type { ModuleKey } from './auth/rbac';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Forbidden } from './components/Forbidden';
import { EmptyState, PageLoader } from './components/StateViews';
import { NetworkBanner } from './components/NetworkBanner';
import Login from './pages/Login';
import LegalPage from './pages/legal/LegalPage';
import AppLayout from './layouts/AppLayout';

// ── Route-level code splitting ────────────────────────────────────────────────
// Every content page is its own chunk — the shell (login + layout) stays in
// the entry bundle, so first paint no longer downloads the whole portal.

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ApplicationsList = lazy(() => import('./pages/applications/ApplicationsList'));
const ApplicationDetails = lazy(() => import('./pages/applications/ApplicationDetails'));
const CustomersList = lazy(() => import('./pages/customers/CustomersList'));
const CustomerDetails = lazy(() => import('./pages/customers/CustomerDetails'));
const Appraisals = lazy(() => import('./pages/appraisals/Appraisals'));
const AgentManagement = lazy(() => import('./pages/agents/AgentManagement'));
const BranchManagement = lazy(() => import('./pages/branches/BranchManagement'));
const CreditQueue = lazy(() => import('./pages/credit/CreditQueue'));
const FinanceQueue = lazy(() => import('./pages/finance/FinanceQueue'));
const LoanAccounts = lazy(() => import('./pages/lms/LoanAccounts'));
const LoanDetails = lazy(() => import('./pages/lms/LoanDetails'));
const EmiSchedulePage = lazy(() =>
  import('./pages/lms/LmsLists').then((m) => ({ default: m.EmiSchedulePage })),
);
const RepaymentsPage = lazy(() =>
  import('./pages/lms/LmsLists').then((m) => ({ default: m.RepaymentsPage })),
);
const ChargesPage = lazy(() =>
  import('./pages/lms/LmsLists').then((m) => ({ default: m.ChargesPage })),
);
const DocumentsPage = lazy(() =>
  import('./pages/lms/LmsLists').then((m) => ({ default: m.DocumentsPage })),
);
const NachBatches = lazy(() => import('./pages/lms/NachBatches'));
const Collections = lazy(() => import('./pages/collections/Collections'));
const Reports = lazy(() => import('./pages/reports/Reports'));
const UserManagement = lazy(() => import('./pages/users/UserManagement'));
const RolesPermissions = lazy(() => import('./pages/permissions/RolesPermissions'));
const ApprovalsQueue = lazy(() => import('./pages/approvals/ApprovalsQueue'));
const AuditLogs = lazy(() => import('./pages/audit/AuditLogs'));
const Settings = lazy(() => import('./pages/settings/Settings'));

/**
 * Route guard. Resolves against the user's REAL grants from GET /permissions/me,
 * not the static role table that used to be compiled into the bundle — so the
 * portal and the API can no longer disagree about who may see what.
 *
 * AppLayout blocks rendering until the grants have loaded, so by the time a guard
 * runs the store is populated: an empty `grants` here means genuinely no access,
 * not "not fetched yet".
 */
const RequireModule: React.FC<{ module: ModuleKey; children: React.ReactNode }> = ({
  module,
  children,
}) => {
  const user = useAuthStore((s) => s.user);
  const allowed = useCanAccess(module);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowed) {
    return <Forbidden module={module} />;
  }
  return <>{children}</>;
};

/** Consistent empty view for tables; lighter default elsewhere (selects, etc.). */
const renderEmpty = (componentName?: string): React.ReactNode =>
  componentName === 'Table' ? <EmptyState /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;

const App: React.FC = () => (
  <ConfigProvider theme={theme} renderEmpty={renderEmpty}>
    <AntApp>
      <NetworkBanner />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<PageLoader tip="Loading module…" />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Public policy pages — reachable before sign-in, outside the
                  authenticated shell. One component serves all four. */}
              <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
              <Route path="/legal/:doc" element={<LegalPage />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                <Route
                  path="applications"
                  element={
                    <RequireModule module="applications">
                      <ApplicationsList preset="all" />
                    </RequireModule>
                  }
                />
                <Route
                  path="applications/submitted"
                  element={
                    <RequireModule module="applications">
                      <ApplicationsList preset="submitted" />
                    </RequireModule>
                  }
                />
                <Route
                  path="applications/credit-pending"
                  element={
                    <RequireModule module="applications">
                      <ApplicationsList preset="credit-pending" />
                    </RequireModule>
                  }
                />
                <Route
                  path="applications/finance-pending"
                  element={
                    <RequireModule module="applications">
                      <ApplicationsList preset="finance-pending" />
                    </RequireModule>
                  }
                />
                <Route
                  path="applications/disbursed"
                  element={
                    <RequireModule module="applications">
                      <ApplicationsList preset="disbursed" />
                    </RequireModule>
                  }
                />
                <Route
                  path="applications/view/:id"
                  element={
                    <RequireModule module="applications">
                      <ApplicationDetails />
                    </RequireModule>
                  }
                />

                <Route
                  path="customers"
                  element={
                    <RequireModule module="customers">
                      <CustomersList />
                    </RequireModule>
                  }
                />
                <Route
                  path="customers/:mobile"
                  element={
                    <RequireModule module="customers">
                      <CustomerDetails />
                    </RequireModule>
                  }
                />

                <Route
                  path="appraisals"
                  element={
                    <RequireModule module="appraisals">
                      <Appraisals />
                    </RequireModule>
                  }
                />

                <Route path="credit" element={<Navigate to="/credit/pending" replace />} />
                <Route
                  path="credit/:tab"
                  element={
                    <RequireModule module="credit">
                      <CreditQueue />
                    </RequireModule>
                  }
                />

                <Route path="finance" element={<Navigate to="/finance/pending" replace />} />
                <Route
                  path="finance/:tab"
                  element={
                    <RequireModule module="finance">
                      <FinanceQueue />
                    </RequireModule>
                  }
                />

                {/* Loan Management (LMS / servicing) — post-disbursement loan book */}
                <Route path="lms" element={<Navigate to="/lms/accounts" replace />} />
                <Route
                  path="lms/accounts"
                  element={
                    <RequireModule module="lms">
                      <LoanAccounts />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/accounts/:loanNumber"
                  element={
                    <RequireModule module="lms">
                      <LoanDetails />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/emi-schedule"
                  element={
                    <RequireModule module="lms">
                      <EmiSchedulePage />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/repayments"
                  element={
                    <RequireModule module="lms">
                      <RepaymentsPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/nach"
                  element={
                    <RequireModule module="lms">
                      <NachBatches />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/charges"
                  element={
                    <RequireModule module="lms">
                      <ChargesPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="lms/documents"
                  element={
                    <RequireModule module="lms">
                      <DocumentsPage />
                    </RequireModule>
                  }
                />

                <Route
                  path="collections"
                  element={<Navigate to="/collections/due-today" replace />}
                />
                <Route
                  path="collections/:tab"
                  element={
                    <RequireModule module="collections">
                      <Collections />
                    </RequireModule>
                  }
                />

                <Route path="reports" element={<Navigate to="/reports/los" replace />} />
                <Route
                  path="reports/:tab"
                  element={
                    <RequireModule module="reports">
                      <Reports />
                    </RequireModule>
                  }
                />

                <Route
                  path="agents"
                  element={
                    <RequireModule module="agents">
                      <AgentManagement />
                    </RequireModule>
                  }
                />
                <Route
                  path="branches"
                  element={
                    <RequireModule module="branches">
                      <BranchManagement />
                    </RequireModule>
                  }
                />

                <Route
                  path="users"
                  element={
                    <RequireModule module="users">
                      <UserManagement />
                    </RequireModule>
                  }
                />
                <Route
                  path="approvals"
                  element={
                    <RequireModule module="approvals">
                      <ApprovalsQueue />
                    </RequireModule>
                  }
                />
                <Route
                  path="permissions"
                  element={
                    <RequireModule module="permissions">
                      <RolesPermissions />
                    </RequireModule>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RequireModule module="audit">
                      <AuditLogs />
                    </RequireModule>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RequireModule module="settings">
                      <Settings />
                    </RequireModule>
                  }
                />

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </AntApp>
  </ConfigProvider>
);

export default App;

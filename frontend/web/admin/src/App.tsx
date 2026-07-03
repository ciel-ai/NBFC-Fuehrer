import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App as AntApp, Button, ConfigProvider, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { nbfcTheme } from './theme/nbfcTheme';
import './styles/nbfc-ui.css';
import { useAuthStore } from './store/authStore';
import { canAccess } from './auth/rbac';
import type { ModuleKey } from './auth/rbac';
import Login from './pages/Login';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import ApplicationsList from './pages/applications/ApplicationsList';
import ApplicationDetails from './pages/applications/ApplicationDetails';
import CustomersList from './pages/customers/CustomersList';
import CustomerDetails from './pages/customers/CustomerDetails';
import Appraisals from './pages/appraisals/Appraisals';
import AgentManagement from './pages/agents/AgentManagement';
import BranchManagement from './pages/branches/BranchManagement';
import CreditQueue from './pages/credit/CreditQueue';
import FinanceQueue from './pages/finance/FinanceQueue';

import Collections from './pages/collections/Collections';
import Reports from './pages/reports/Reports';
import UserManagement from './pages/users/UserManagement';
import AuditLogs from './pages/audit/AuditLogs';
import Settings from './pages/settings/Settings';

/** Renders children only when the signed-in role has access to the module. */
const RequireModule: React.FC<{ module: ModuleKey; children: React.ReactNode }> = ({ module, children }) => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, module)) {
    return (
      <Result
        status="403"
        title="Access Restricted"
        subTitle="Your role does not include this module. Contact the administrator if you believe this is a mistake."
        extra={<Button type="primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>}
      />
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => (
  <ConfigProvider theme={nbfcTheme}>
    <AntApp>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route path="applications" element={<RequireModule module="applications"><ApplicationsList preset="all" /></RequireModule>} />
            <Route path="applications/submitted" element={<RequireModule module="applications"><ApplicationsList preset="submitted" /></RequireModule>} />
            <Route path="applications/credit-pending" element={<RequireModule module="applications"><ApplicationsList preset="credit-pending" /></RequireModule>} />
            <Route path="applications/finance-pending" element={<RequireModule module="applications"><ApplicationsList preset="finance-pending" /></RequireModule>} />
            <Route path="applications/disbursed" element={<RequireModule module="applications"><ApplicationsList preset="disbursed" /></RequireModule>} />
            <Route path="applications/view/:id" element={<RequireModule module="applications"><ApplicationDetails /></RequireModule>} />

            <Route path="customers" element={<RequireModule module="customers"><CustomersList /></RequireModule>} />
            <Route path="customers/:mobile" element={<RequireModule module="customers"><CustomerDetails /></RequireModule>} />

            <Route path="appraisals" element={<RequireModule module="appraisals"><Appraisals /></RequireModule>} />

            <Route path="credit" element={<Navigate to="/credit/pending" replace />} />
            <Route path="credit/:tab" element={<RequireModule module="credit"><CreditQueue /></RequireModule>} />

            <Route path="finance" element={<Navigate to="/finance/pending" replace />} />
            <Route path="finance/:tab" element={<RequireModule module="finance"><FinanceQueue /></RequireModule>} />

           
            <Route path="collections" element={<Navigate to="/collections/due-today" replace />} />
            <Route path="collections/:tab" element={<RequireModule module="collections"><Collections /></RequireModule>} />

            <Route path="reports" element={<Navigate to="/reports/los" replace />} />
            <Route path="reports/:tab" element={<RequireModule module="reports"><Reports /></RequireModule>} />

            <Route path="agents" element={<RequireModule module="agents"><AgentManagement /></RequireModule>} />
            <Route path="branches" element={<RequireModule module="branches"><BranchManagement /></RequireModule>} />

            <Route path="users" element={<RequireModule module="users"><UserManagement /></RequireModule>} />
            <Route path="audit" element={<RequireModule module="audit"><AuditLogs /></RequireModule>} />
            <Route path="settings" element={<RequireModule module="settings"><Settings /></RequireModule>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AntApp>
  </ConfigProvider>
);

export default App;

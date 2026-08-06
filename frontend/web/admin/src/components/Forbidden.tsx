import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROLE_META } from '../auth/rbac';
import type { ModuleKey } from '../auth/rbac';
import { usePermissionStore } from '../auth/permissionStore';
import { useAuthStore } from '../store/authStore';
import './Forbidden.css';

/* ============================================================================
 * 403.
 *
 * The previous screen was a stock <Result status="403"> — a giant cartoon
 * illustration and "Sorry, you are not authorized to access this page", which
 * tells the user precisely nothing they can act on.
 *
 * In a regulated back-office an access refusal is an ordinary, expected event:
 * RBAC is doing its job. So this reads as a record, not an error. It states the
 * three facts the person actually needs — what was refused, who they are signed
 * in as, and what they CAN reach — and gives them somewhere to go.
 * ==========================================================================*/

const MODULE_LABEL: Partial<Record<ModuleKey, string>> = {
  dashboard: 'Dashboard',
  applications: 'Applications',
  customers: 'Customers',
  appraisals: 'Appraisals',
  credit: 'Credit',
  finance: 'Finance',
  lms: 'Loan Management',
  collections: 'Collections',
  reports: 'Reports',
  agents: 'Agents',
  branches: 'Branches',
  users: 'User Management',
  approvals: 'Approvals',
  permissions: 'Roles & Permissions',
  audit: 'Audit Logs',
  settings: 'Settings',
};

const HOME: Partial<Record<ModuleKey, string>> = {
  dashboard: '/dashboard',
  applications: '/applications',
  customers: '/customers',
  appraisals: '/appraisals',
  credit: '/credit/pending',
  finance: '/finance/pending',
  lms: '/lms/accounts',
  collections: '/collections/due-today',
  reports: '/reports/los',
  agents: '/agents',
  branches: '/branches',
  users: '/users',
  approvals: '/approvals',
  permissions: '/permissions',
  audit: '/audit',
  settings: '/settings',
};

export const Forbidden: React.FC<{ module: ModuleKey }> = ({ module }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const grants = usePermissionStore((s) => s.grants);
  const degraded = usePermissionStore((s) => s.status === 'fallback');
  const reason = usePermissionStore((s) => s.error);

  const allowed = (Object.keys(grants) as ModuleKey[])
    .filter((m) => m !== 'dashboard' && MODULE_LABEL[m])
    .slice(0, 8);

  return (
    <div className="forbidden">
      <div className="forbidden__code t-label">403 · Access refused</div>

      <h1 className="forbidden__title">
        You do not have access to {MODULE_LABEL[module] ?? module}
      </h1>

      <p className="forbidden__body">
        Your role {user && <strong>{ROLE_META[user.role].label}</strong>} does not carry a grant for
        this module. This is a permission boundary, not a fault — request access from an
        administrator if you need it.
      </p>

      {/* Don't assert WHY the grants are degraded — say what the store actually
          knows. "The permissions service was unreachable" is a lie in mock mode. */}
      {degraded && reason && (
        <p className="forbidden__degraded">
          {reason}. This decision was made from your role’s default access rather than live grants.
        </p>
      )}

      {allowed.length > 0 && (
        <div className="forbidden__allowed">
          <div className="t-label">Modules you can reach</div>
          <div className="forbidden__chips">
            {allowed.map((m) => (
              <button
                key={m}
                type="button"
                className="forbidden__chip"
                onClick={() => navigate(HOME[m] ?? '/dashboard')}
              >
                {MODULE_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="forbidden__actions">
        <Button type="primary" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </Button>
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    </div>
  );
};

export default Forbidden;

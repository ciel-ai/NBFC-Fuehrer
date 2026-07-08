// pages/permissions/RolesPermissions.tsx
//
// Roles & Permissions — the access-control rulebook, visible and editable.
// Reads the RBAC model (roles × module grants) from the backend; admins can
// toggle READ/WRITE grants per cell. No sample-data fallback: this screen
// IS the audit surface, so an unreachable API shows an explicit error.

import React, { useEffect, useMemo, useState } from 'react';
import { App, Card, Input, Table, Tag, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { ErrorState, PageLoader } from '../../components/StateViews';
import { permissionsApi } from '../../api/permissions.api';
import type { RoleRow } from '../../api/permissions.api';

const ACTIONS = ['READ', 'WRITE'] as const;

const RolesPermissions: React.FC = () => {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<RoleRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyCell, setBusyCell] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setRoles(await permissionsApi.listRoles());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const modules = useMemo(() => {
    const set = new Set<string>();
    (roles ?? []).forEach((r) => r.permissions.forEach((p) => set.add(p.module)));
    return [...set].sort();
  }, [roles]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (roles ?? []).filter((r) => !q || `${r.name} ${r.label}`.toLowerCase().includes(q));
  }, [roles, search]);

  const has = (r: RoleRow, module: string, action: string): boolean =>
    r.permissions.some((p) => p.module === module && p.action === action);

  const toggle = async (r: RoleRow, module: string, action: string): Promise<void> => {
    const key = `${r.name}:${module}:${action}`;
    setBusyCell(key);
    try {
      if (has(r, module, action)) {
        await permissionsApi.revoke(r.name, module, action);
        message.success(`Revoked ${module}:${action} from ${r.label}`);
      } else {
        await permissionsApi.grant(r.name, module, action);
        message.success(`Granted ${module}:${action} to ${r.label}`);
      }
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message ?? 'Change failed — permission not modified.');
    } finally {
      setBusyCell(null);
    }
  };

  if (loading && roles === null) return <PageLoader />;
  if (error && roles === null) {
    return (
      <div>
        <PageHeader title="Roles & Permissions" subtitle="Access-control rulebook" />
        <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }}>
          <ErrorState
            title="Could not load the permission model"
            detail="The permissions API did not respond. This screen has no sample fallback by design — it is the audit surface for access control."
            onRetry={() => { void load(); }}
          />
        </Card>
      </div>
    );
  }

  const columns: TableProps<RoleRow>['columns'] = [
    {
      title: 'Role',
      dataIndex: 'label',
      width: 230,
      fixed: 'left',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{v}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.name}{r.is_active ? '' : ' · INACTIVE'}</div>
        </div>
      ),
    },
    ...modules.map((m) => ({
      title: <span style={{ fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>{m}</span>,
      key: m,
      width: 110,
      align: 'center' as const,
      render: (_: unknown, r: RoleRow) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {ACTIONS.map((a) => {
            const granted = has(r, m, a);
            const busy = busyCell === `${r.name}:${m}:${a}`;
            return (
              <Tooltip key={a} title={`${granted ? 'Revoke' : 'Grant'} ${m}:${a}`}>
                <Tag
                  onClick={() => { if (!busy) void toggle(r, m, a); }}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    margin: 0,
                    borderRadius: 6,
                    fontSize: 10.5,
                    fontWeight: 700,
                    opacity: busy ? 0.4 : 1,
                    color: granted ? (a === 'WRITE' ? '#9a3412' : '#075985') : '#c2c9d4',
                    background: granted ? (a === 'WRITE' ? '#fff7ed' : '#f0f9ff') : '#f8fafc',
                    borderColor: granted ? (a === 'WRITE' ? '#fed7aa' : '#bae6fd') : '#eef1f5',
                  }}
                >
                  {a === 'READ' ? 'R' : 'W'}
                </Tag>
              </Tooltip>
            );
          })}
        </span>
      ),
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`Access-control rulebook · ${roles?.length ?? 0} roles · ${modules.length} modules · live`}
      />
      <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #eef1f5' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Search roles…"
            allowClear
            style={{ width: 260 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ marginLeft: 14, fontSize: 12, color: '#9ca3af' }}>
            Click R / W chips to grant or revoke. Changes apply immediately and are audited.
          </span>
        </div>
        <Table<RoleRow>
          dataSource={rows}
          columns={columns}
          rowKey="name"
          loading={loading}
          size="middle"
          scroll={{ x: 230 + modules.length * 110 }}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default RolesPermissions;

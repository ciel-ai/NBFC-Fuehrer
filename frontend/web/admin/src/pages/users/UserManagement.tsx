import React, { useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import {
  KeyOutlined,
  PlusOutlined,
  SearchOutlined,
  UserAddOutlined,
  BankOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useStaffUsers } from '../../hooks/useStaffUsers';
import { usersApi } from '../../api/users.api';
import { useAuthStore } from '../../store/authStore';
import { ROLE_META } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { MetricBand } from '../../components/KpiCard';
import { RoleTag, StatusTag, roleTone } from '../../components/StatusTag';
import { fmtDate, fmtTimeAgo, initials } from '../../utils/format';
import type { PortalUser, Role } from '../../types';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';

const ASSIGNABLE_ROLES: Role[] = [
  'ADMIN',
  'SALES_CDL',
  'SALES_GOLD',
  'SALES_HOUSING',
  'CREDIT_CDL',
  'CREDIT_GOLD',
  'CREDIT_HOUSING',
  'FINANCE_CDL',
  'FINANCE_GOLD',
  'FINANCE_HOUSING',
];

const UserManagement: React.FC = () => {
  const { message, modal } = App.useApp();
  const sessionUser = useAuthStore((s) => s.user)!;
  const { users, live, loading, reload, source, error } = useStaffUsers();
  const branches = useAppStore((s) => s.branches);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const toggleUserStatus = useAppStore((s) => s.toggleUserStatus);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form] = Form.useForm();

  const actor = { name: sessionUser.name, role: sessionUser.role };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (q && !`${u.name} ${u.email} ${u.phone} ${u.branch}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const openCreate = (): void => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true, role: 'CREDIT_CDL' });
    setDrawerOpen(true);
  };

  const openEdit = (u: PortalUser): void => {
    setEditing(u);
    form.setFieldsValue({
      name: u.name,
      phone: u.phone,
      email: u.email,
      branch: u.branch,
      role: u.role,
      status: u.status === 'ACTIVE',
    });
    setDrawerOpen(true);
  };

  const onSubmit = async (values: any): Promise<void> => {
    // Live: write through the real staff-users API, then re-fetch the list.
    // Fallback: local store (sample data) when the API is unreachable.
    if (live) {
      try {
        if (editing) {
          await usersApi.update(editing.id, {
            name: values.name,
            phone: values.phone,
            email: values.email,
            role: values.role,
            status: values.status ? 'ACTIVE' : 'INACTIVE',
          });
          message.success(`${values.name} updated`);
        } else {
          await usersApi.create({
            name: values.name,
            phone: values.phone,
            email: values.email,
            role: values.role,
          });
          const isSales = ROLE_META[values.role as Role].family === 'SALES';
          message.success(
            isSales
              ? `${values.name} created — mobile app OTP login enabled on ${values.phone}`
              : `${values.name} created — web OTP login enabled on ${values.phone}`,
          );
        }
        reload();
        setDrawerOpen(false);
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e.response?.data?.message ?? 'Could not save the user — please retry.');
      }
      return;
    }

    if (editing) {
      updateUser(
        editing.id,
        {
          name: values.name,
          phone: values.phone,
          email: values.email,
          branch: values.branch,
          role: values.role,
          status: values.status ? 'ACTIVE' : 'INACTIVE',
        },
        actor,
      );
      message.success(`${values.name} updated`);
    } else {
      addUser(
        {
          name: values.name,
          phone: values.phone,
          email: values.email,
          branch: values.branch,
          role: values.role,
          status: values.status ? 'ACTIVE' : 'INACTIVE',
        },
        actor,
      );
      const isSales = ROLE_META[values.role as Role].family === 'SALES';
      message.success(
        isSales
          ? `${values.name} created — mobile app OTP login enabled on ${values.phone}`
          : `${values.name} created — web OTP login enabled on ${values.phone}`,
      );
    }
    setDrawerOpen(false);
  };

  const resetPassword = async (u: PortalUser): Promise<void> => {
    // Live: the backend resets the credential and returns the password it set —
    // show exactly that, never a client-invented one (that would never log in).
    // A local temp is legitimate only in the mock/demo fallback where there is
    // no backend to authoritatively reset anything.
    let temp: string;
    if (live) {
      try {
        const res = await usersApi.resetPassword(u.id);
        temp = res.temporaryPassword;
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(e.response?.data?.message ?? 'Could not reset the password — please retry.');
        return;
      }
    } else {
      temp = `Fnbfc@${Math.floor(1000 + Math.random() * 9000)}`;
    }
    modal.success({
      title: `Credentials reset for ${u.name}`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            A temporary password has been generated. The user must change it at next login.
          </p>
          <Typography.Paragraph
            copyable={{ text: temp }}
            style={{
              fontSize: 17,
              fontWeight: 700,
              fontFamily: 'monospace',
              background: 'var(--ink-50)',
              padding: '8px 14px',
              borderRadius: 8,
              display: 'inline-block',
            }}
          >
            {temp}
          </Typography.Paragraph>
        </div>
      ),
    });
    useAppStore.getState().logAudit({
      user: actor.name,
      role: String(actor.role),
      module: 'User Management',
      action: 'Password Reset',
      entity: u.email,
    });
  };

  const columns: TableProps<PortalUser>['columns'] = [
    {
      title: 'User',
      dataIndex: 'name',
      render: (v: string, r) => {
        return (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar size={28} className={`avatar-tone tone-${roleTone(r.role)}`}>
              {initials(v)}
            </Avatar>
            <div>
              <div className="u-semibold u-ink-900">{v}</div>
              <div className="u-xs u-ink-400">{r.email}</div>
            </div>
          </div>
        );
      },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 130,
      render: (v: string) => <span className="tnum u-sm u-ink-600">+91 {v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 215,
      render: (r: Role) => {
        const meta = ROLE_META[r];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <RoleTag role={r} />
            {meta.family === 'SALES' && (
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 999,
                  fontSize: 10.5,
                  padding: '1px 8px',
                  color: 'var(--ink-500)',
                  background: 'var(--ink-50)',
                  borderColor: 'var(--ink-150)',
                }}
              >
                Mobile App
              </Tag>
            )}
          </div>
        );
      },
      filters: Object.entries(ROLE_META).map(([k, m]) => ({ text: m.label, value: k })),
      onFilter: (v, r) => r.role === v,
    },
    {
      title: 'Branch',
      dataIndex: 'branch',
      width: 190,
      render: (v: string) => (
        <span className="u-sm u-ink-500">
          <BankOutlined style={{ marginRight: 6 }} />
          {v}
        </span>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLoginAt',
      width: 125,
      render: (v?: string) => <span className="u-sm u-ink-500">{v ? fmtTimeAgo(v) : 'never'}</span>,
    },
    {
      title: 'Since',
      dataIndex: 'createdAt',
      width: 115,
      render: (v: string) => <span className="u-sm u-ink-400">{fmtDate(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 95,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 230,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => resetPassword(r)}>
            Reset
          </Button>
          <Switch
            size="small"
            aria-label={`${r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${r.name}`}
            checked={r.status === 'ACTIVE'}
            disabled={r.role === 'ADMIN'}
            onChange={async () => {
              if (live) {
                try {
                  await (r.status === 'ACTIVE'
                    ? usersApi.deactivate(r.id)
                    : usersApi.activate(r.id));
                  reload();
                } catch {
                  message.error('Could not change user status — please retry.');
                  return;
                }
              } else {
                toggleUserStatus(r.id, actor);
              }
              message.success(`${r.name} ${r.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);
            }}
          />
        </div>
      ),
    },
  ];

  const active = users.filter((u) => u.status === 'ACTIVE').length;
  const creditCount = users.filter((u) => ROLE_META[u.role].family === 'CREDIT').length;
  const financeCount = users.filter((u) => ROLE_META[u.role].family === 'FINANCE').length;
  const salesCount = users.filter((u) => ROLE_META[u.role].family === 'SALES').length;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`Provision credit & finance users, assign roles and control access`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create User
          </Button>
        }
      />

      <DataSourceNotice source={source} error={error} onRetry={reload} />

      <MetricBand
        metrics={[
          {
            label: 'Total Users',
            value: users.length,
            sub: `${active} active · ${users.length - active} deactivated`,
          },
          { label: 'Sales Team', value: salesCount, sub: 'mobile app field agents' },
          { label: 'Credit Team', value: creditCount, sub: 'underwriters across products' },
          { label: 'Finance Team', value: financeCount, sub: 'disbursement officers' },
        ]}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '16px 18px',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--ink-100)',
          }}
        >
          <Input
            prefix={<SearchOutlined className="u-ink-400" />}
            placeholder="Search name, email, phone, branch…"
            allowClear
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label="Role"
            placeholder="Role"
            allowClear
            style={{ width: 230 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={Object.entries(ROLE_META).map(([k, m]) => ({ value: k, label: m.label }))}
          />
        </div>
        <DataTable<PortalUser>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1180 }}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} users` }}
        />
      </Card>

      <Drawer
        title={
          <span>
            <UserAddOutlined style={{ marginRight: 8, color: 'var(--accent)' }} />
            {editing ? `Edit User — ${editing.name}` : 'Create User'}
          </span>
        }
        size={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editing ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
          <Form.Item
            label="Full Name"
            name="name"
            rules={[{ required: true, message: 'Enter the full name' }]}
          >
            <Input placeholder="e.g. Ramesh Iyer" />
          </Form.Item>
          <Form.Item
            label="Phone Number (OTP login)"
            name="phone"
            rules={[
              { required: true, message: 'Enter the mobile number' },
              { pattern: /^[6-9]\d{9}$/, message: 'Valid 10-digit mobile required' },
            ]}
          >
            <Input addonBefore="+91" maxLength={10} placeholder="98XXXXXXXX" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
          >
            <Input placeholder="name@fuehrer-nbfc.in" />
          </Form.Item>
          <Form.Item
            label="Branch"
            name="branch"
            rules={[{ required: true, message: 'Select branch' }]}
          >
            <Select
              aria-label="Select branch"
              placeholder="Select branch"
              options={branches.map((b) => ({ value: b.name, label: b.name }))}
              showSearch
            />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select
              options={ASSIGNABLE_ROLES.map((r) => ({
                value: r,
                label: (
                  <span>
                    <span
                      className={`status-tag status-tag--${roleTone(r)} status-tag--sm`}
                      style={{ marginRight: 8 }}
                    >
                      {ROLE_META[r].family}
                    </span>
                    {ROLE_META[r].label}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item label="Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-400)',
              background: 'var(--ink-50)',
              border: '1px solid var(--ink-100)',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            All users sign in with mobile number + OTP. <strong>Credit &amp; Finance</strong> roles
            access this web dashboard; <strong>Sales</strong> roles use the FUEHRER field mobile app
            to source applications. Module access and data visibility follow the assigned role
            automatically.
          </div>
        </Form>
      </Drawer>
    </div>
  );
};

export default UserManagement;

import React, { useMemo, useState } from 'react';
import {
  App, Avatar, Button, Card, Col, Drawer, Form, Input, Row, Select, Switch, Table, Tag, Typography,
} from 'antd';
import type { TableProps } from 'antd';
import {
  KeyOutlined, PlusOutlined, SearchOutlined, TeamOutlined, UserAddOutlined,
  UserSwitchOutlined, SafetyCertificateOutlined, BankOutlined, EditOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { ROLE_META } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { StatusTag } from '../../components/StatusTag';
import { fmtDate, fmtTimeAgo, initials } from '../../utils/format';
import type { PortalUser, Role } from '../../types';

const ASSIGNABLE_ROLES: Role[] = [
  'ADMIN',
  'SALES_CDL', 'SALES_GOLD', 'SALES_HOUSING',
  'CREDIT_CDL', 'CREDIT_GOLD', 'CREDIT_HOUSING',
  'FINANCE_CDL', 'FINANCE_GOLD', 'FINANCE_HOUSING',
];

const UserManagement: React.FC = () => {
  const { message, modal } = App.useApp();
  const sessionUser = useAuthStore((s) => s.user)!;
  const users = useAppStore((s) => s.users);
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
      if (q && !`${u.name} ${u.email} ${u.phone} ${u.branch}`.toLowerCase().includes(q)) return false;
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
    form.setFieldsValue({ name: u.name, phone: u.phone, email: u.email, branch: u.branch, role: u.role, status: u.status === 'ACTIVE' });
    setDrawerOpen(true);
  };

  const onSubmit = (values: any): void => {
    if (editing) {
      updateUser(editing.id, {
        name: values.name, phone: values.phone, email: values.email,
        branch: values.branch, role: values.role, status: values.status ? 'ACTIVE' : 'INACTIVE',
      }, actor);
      message.success(`${values.name} updated`);
    } else {
      addUser({
        name: values.name, phone: values.phone, email: values.email,
        branch: values.branch, role: values.role, status: values.status ? 'ACTIVE' : 'INACTIVE',
      }, actor);
      const isSales = ROLE_META[values.role as Role].family === 'SALES';
      message.success(
        isSales
          ? `${values.name} created — mobile app OTP login enabled on ${values.phone}`
          : `${values.name} created — web OTP login enabled on ${values.phone}`,
      );
    }
    setDrawerOpen(false);
  };

  const resetPassword = (u: PortalUser): void => {
    const temp = `Fnbfc@${Math.floor(1000 + Math.random() * 9000)}`;
    modal.success({
      title: `Credentials reset for ${u.name}`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>A temporary password has been generated. The user must change it at next login.</p>
          <Typography.Paragraph copyable={{ text: temp }} style={{ fontSize: 17, fontWeight: 700, fontFamily: 'monospace', background: '#f4f6fb', padding: '8px 14px', borderRadius: 8, display: 'inline-block' }}>
            {temp}
          </Typography.Paragraph>
        </div>
      ),
    });
    useAppStore.getState().logAudit({ user: actor.name, role: String(actor.role), module: 'User Management', action: 'Password Reset', entity: u.email });
  };

  const columns: TableProps<PortalUser>['columns'] = [
    {
      title: 'User',
      dataIndex: 'name',
      render: (v: string, r) => {
        const meta = ROLE_META[r.role];
        return (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar size={38} style={{ background: `${meta.color}18`, color: meta.color, fontWeight: 700, fontSize: 13 }}>{initials(v)}</Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{r.email}</div>
            </div>
          </div>
        );
      },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    { title: 'Phone', dataIndex: 'phone', width: 130, render: (v: string) => <span className="tnum" style={{ fontSize: 12.5, color: '#475569' }}>+91 {v}</span> },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 215,
      render: (r: Role) => {
        const meta = ROLE_META[r];
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag style={{ margin: 0, borderRadius: 999, fontWeight: 600, fontSize: 11.5, padding: '2px 11px', color: meta.color, background: `${meta.color}10`, borderColor: `${meta.color}30` }}>
              {meta.label}
            </Tag>
            {meta.family === 'SALES' && (
              <Tag style={{ margin: 0, borderRadius: 999, fontSize: 10.5, padding: '1px 8px', color: '#64748b', background: '#f1f5f9', borderColor: '#e2e8f0' }}>
                Mobile App
              </Tag>
            )}
          </div>
        );
      },
      filters: Object.entries(ROLE_META).map(([k, m]) => ({ text: m.label, value: k })),
      onFilter: (v, r) => r.role === v,
    },
    { title: 'Branch', dataIndex: 'branch', width: 190, render: (v: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}><BankOutlined style={{ marginRight: 6 }} />{v}</span> },
    { title: 'Last Login', dataIndex: 'lastLoginAt', width: 125, render: (v?: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{v ? fmtTimeAgo(v) : 'never'}</span> },
    { title: 'Since', dataIndex: 'createdAt', width: 115, render: (v: string) => <span style={{ fontSize: 12.5, color: '#94a3b8' }}>{fmtDate(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 95, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 230,
      fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => resetPassword(r)}>Reset</Button>
          <Switch
            size="small"
            checked={r.status === 'ACTIVE'}
            disabled={r.role === 'ADMIN'}
            onChange={() => {
              toggleUserStatus(r.id, actor);
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
        subtitle="Provision credit & finance users, assign roles and control access"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create User</Button>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Total Users" value={users.length} sub={`${active} active · ${users.length - active} deactivated`} icon={<TeamOutlined />} tint="#2563eb" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Sales Team" value={salesCount} sub="mobile app field agents" icon={<UserSwitchOutlined />} tint="#0e7490" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Credit Team" value={creditCount} sub="underwriters across products" icon={<SafetyCertificateOutlined />} tint="#d97706" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Finance Team" value={financeCount} sub="disbursement officers" icon={<BankOutlined />} tint="#047857" /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search name, email, phone, branch…"
            allowClear
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: 230 }}
            value={roleFilter}
            onChange={setRoleFilter}
            options={Object.entries(ROLE_META).map(([k, m]) => ({ value: k, label: m.label }))}
          />
        </div>
        <Table<PortalUser>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1180 }}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} users` }}
        />
      </Card>

      <Drawer
        title={
          <span>
            <UserAddOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            {editing ? `Edit User — ${editing.name}` : 'Create User'}
          </span>
        }
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Save Changes' : 'Create User'}</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Enter the full name' }]}>
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
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input placeholder="name@fuehrer-nbfc.in" />
          </Form.Item>
          <Form.Item label="Branch" name="branch" rules={[{ required: true, message: 'Select branch' }]}>
            <Select placeholder="Select branch" options={branches.map((b) => ({ value: b.name, label: b.name }))} showSearch />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select
              options={ASSIGNABLE_ROLES.map((r) => ({
                value: r,
                label: (
                  <span>
                    <Tag style={{ borderRadius: 6, marginRight: 8, color: ROLE_META[r].color, background: `${ROLE_META[r].color}10`, borderColor: `${ROLE_META[r].color}30`, fontWeight: 600, fontSize: 11 }}>
                      {ROLE_META[r].family}
                    </Tag>
                    {ROLE_META[r].label}
                  </span>
                ),
              }))}
            />
          </Form.Item>
          <Form.Item label="Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <div style={{ fontSize: 12, color: '#94a3b8', background: '#f8fafd', border: '1px solid #eef1f7', borderRadius: 10, padding: '10px 14px' }}>
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

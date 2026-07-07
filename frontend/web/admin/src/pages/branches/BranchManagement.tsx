import React, { useMemo, useState } from 'react';
import {
  App, Button, Card, Col, Drawer, Form, Input, Row, Select, Switch, Table, Tag,
} from 'antd';
import type { TableProps } from 'antd';
import {
  BankOutlined, DownloadOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined,
  SearchOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate } from '../../utils/format';
import type { Branch, LoanType } from '../../types';

const PRODUCT_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'CDL', label: 'Consumer Durable' },
  { value: 'GOLD', label: 'Gold Loan' },
  { value: 'HOUSING', label: 'Affordable Housing' },
];

const BranchManagement: React.FC = () => {
  const { message } = App.useApp();
  const sessionUser = useAuthStore((s) => s.user)!;
  const branches = useAppStore((s) => s.branches);
  const users = useAppStore((s) => s.users);
  const addBranch = useAppStore((s) => s.addBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const toggleBranchStatus = useAppStore((s) => s.toggleBranchStatus);

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form] = Form.useForm();

  const actor = { name: sessionUser.name, role: sessionUser.role };

  // staff assigned per branch (by name match)
  const staffByBranch = useMemo(() => {
    const m = new Map<string, number>();
    users.forEach((u) => m.set(u.branch, (m.get(u.branch) ?? 0) + 1));
    return m;
  }, [users]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => !q || `${b.name} ${b.code} ${b.city} ${b.state} ${b.manager}`.toLowerCase().includes(q));
  }, [branches, search]);

  const openCreate = (): void => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true, products: ['CDL', 'GOLD', 'HOUSING'] });
    setDrawerOpen(true);
  };

  const openEdit = (b: Branch): void => {
    setEditing(b);
    form.setFieldsValue({
      code: b.code, name: b.name, city: b.city, state: b.state, address: b.address,
      manager: b.manager, phone: b.phone, products: b.products, status: b.status === 'ACTIVE',
    });
    setDrawerOpen(true);
  };

  const onSubmit = (values: any): void => {
    if (editing) {
      updateBranch(editing.id, {
        name: values.name, city: values.city, state: values.state, address: values.address,
        manager: values.manager, phone: values.phone, products: values.products,
        status: values.status ? 'ACTIVE' : 'INACTIVE',
      }, actor);
      message.success(`${values.name} updated`);
    } else {
      addBranch({
        code: values.code, name: values.name, city: values.city, state: values.state,
        address: values.address, manager: values.manager, phone: values.phone,
        products: values.products, openedOn: new Date().toISOString(),
        status: values.status ? 'ACTIVE' : 'INACTIVE',
      }, actor);
      message.success(`${values.name} created`);
    }
    setDrawerOpen(false);
  };

  const columns: TableProps<Branch>['columns'] = [
    {
      title: 'Branch',
      dataIndex: 'name',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}><BankOutlined style={{ marginRight: 8, color: '#2563eb' }} />{v}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{r.code} · {r.city}, {r.state}</div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    { title: 'Manager', dataIndex: 'manager', width: 165, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}>{v}</span> },
    { title: 'Phone', dataIndex: 'phone', width: 140, render: (v: string) => <span className="tnum" style={{ fontSize: 12.5, color: '#64748b' }}>{v}</span> },
    { title: 'Products', dataIndex: 'products', width: 155, render: (p: LoanType[]) => <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>{p.map((t) => <LoanTypeTag key={t} type={t} />)}</span> },
    { title: 'Staff', key: 'staff', width: 90, align: 'center', render: (_, r) => <span className="tnum" style={{ fontWeight: 600 }}><TeamOutlined style={{ marginRight: 5, color: '#94a3b8' }} />{staffByBranch.get(r.name) ?? 0}</span> },
    { title: 'Opened', dataIndex: 'openedOn', width: 120, render: (v: string) => <span style={{ fontSize: 12.5, color: '#94a3b8' }}>{fmtDate(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 95, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Actions',
      key: 'actions',
      width: 165,
      fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
          <Switch
            size="small"
            checked={r.status === 'ACTIVE'}
            onChange={() => { toggleBranchStatus(r.id, actor); message.success(`${r.name} ${r.status === 'ACTIVE' ? 'deactivated' : 'activated'}`); }}
          />
        </div>
      ),
    },
  ];

  const activeCount = branches.filter((b) => b.status === 'ACTIVE').length;
  const states = new Set(branches.map((b) => b.state)).size;

  const handleExport = (): void => {
    exportCsv(
      `branches-${new Date().toISOString().slice(0, 10)}`,
      ['Code', 'Name', 'City', 'State', 'Manager', 'Phone', 'Products', 'Staff', 'Opened', 'Status'],
      rows.map((b) => [b.code, b.name, b.city, b.state, b.manager, b.phone, b.products.join(' / '), staffByBranch.get(b.name) ?? 0, fmtDate(b.openedOn), b.status]),
    );
  };

  return (
    <div>
      <PageHeader
        title="Branch Management"
        subtitle="Manage branch network, products offered and staffing"
        extra={
          <>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Branch</Button>
          </>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Total Branches" value={branches.length} sub={`${activeCount} active`} icon={<BankOutlined />} tint="#2563eb" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="States Covered" value={states} sub="geographic spread" icon={<EnvironmentOutlined />} tint="#6d4ea8" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Total Staff" value={users.length} sub="across branches" icon={<TeamOutlined />} tint="#0e7490" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Inactive" value={branches.length - activeCount} sub="non-operational" icon={<BankOutlined />} tint="#c0392b" /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search branch, code, city, manager…"
            allowClear
            style={{ width: 320 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Table<Branch>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1180 }}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} branches` }}
        />
      </Card>

      <Drawer
        title={<span><BankOutlined style={{ marginRight: 8, color: '#2563eb' }} />{editing ? `Edit Branch — ${editing.name}` : 'Add Branch'}</span>}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Save Changes' : 'Add Branch'}</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
          {!editing && (
            <Form.Item label="Branch Code" name="code" rules={[{ required: true, message: 'Enter a branch code' }]}>
              <Input placeholder="e.g. MUM-BKC" />
            </Form.Item>
          )}
          <Form.Item label="Branch Name" name="name" rules={[{ required: true, message: 'Enter the branch name' }]}>
            <Input placeholder="e.g. Mumbai BKC" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}><Form.Item label="City" name="city" rules={[{ required: true, message: 'City required' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item label="State" name="state" rules={[{ required: true, message: 'State required' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item label="Address" name="address" rules={[{ required: true, message: 'Address required' }]}>
            <Input.TextArea rows={2} placeholder="Full postal address" />
          </Form.Item>
          <Form.Item label="Branch Manager" name="manager" rules={[{ required: true, message: 'Assign a manager' }]}>
            <Input placeholder="e.g. Ramesh Iyer" />
          </Form.Item>
          <Form.Item label="Phone" name="phone" rules={[{ required: true, message: 'Contact number required' }]}>
            <Input placeholder="e.g. 022 4066 1200" />
          </Form.Item>
          <Form.Item label="Products Offered" name="products" rules={[{ required: true, message: 'Select at least one product' }]}>
            <Select mode="multiple" options={PRODUCT_OPTIONS} />
          </Form.Item>
          <Form.Item label="Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          {editing && (
            <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafd', border: '1px solid #eef1f7', borderRadius: 10, padding: '10px 14px' }}>
              <Tag color="blue" style={{ borderRadius: 6 }}>Opened {fmtDate(editing.openedOn)}</Tag>
              <strong>{staffByBranch.get(editing.name) ?? 0}</strong> staff currently assigned to this branch.
            </div>
          )}
        </Form>
      </Drawer>
    </div>
  );
};

export default BranchManagement;

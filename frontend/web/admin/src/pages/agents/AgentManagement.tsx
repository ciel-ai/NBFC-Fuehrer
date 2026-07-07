import React, { useMemo, useState } from 'react';
import {
  App, Avatar, Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch, Table, Tag,
} from 'antd';
import type { TableProps } from 'antd';
import {
  DollarOutlined, DownloadOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined,
  SearchOutlined, TeamOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { agentsApi } from '../../api/agents.api';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, initials, inr, inrCompact } from '../../utils/format';
import type { Agent, LoanType } from '../../types';

const PRODUCT_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'CDL', label: 'Consumer Durable' },
  { value: 'GOLD', label: 'Gold Loan' },
  { value: 'HOUSING', label: 'Affordable Housing' },
];

const AgentManagement: React.FC = () => {
  const { message } = App.useApp();
  const sessionUser = useAuthStore((s) => s.user)!;
  const agents = useAppStore((s) => s.agents);
  const branches = useAppStore((s) => s.branches);
  const addAgent = useAppStore((s) => s.addAgent);
  const updateAgent = useAppStore((s) => s.updateAgent);
  const toggleAgentStatus = useAppStore((s) => s.toggleAgentStatus);

  const [realAgents, setRealAgents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    agentsApi.list({ limit: 100 })
      .then((res) => { if (res.data?.length) setRealAgents(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const agentList = realAgents.length > 0 ? realAgents : agents;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form] = Form.useForm();

  const actor = { name: sessionUser.name, role: sessionUser.role };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agentList.filter((a: any) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (q && !`${a.name} ${a.code} ${a.phone} ${a.territory} ${a.branch}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [agentList, search, statusFilter]);

  const openCreate = (): void => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: true, products: ['CDL'], commissionRate: 1.5, branch: branches[0]?.name });
    setDrawerOpen(true);
  };

  const openEdit = (a: Agent): void => {
    setEditing(a);
    form.setFieldsValue({
      name: a.name, code: a.code, phone: a.phone, email: a.email, branch: a.branch,
      territory: a.territory, products: a.products, commissionRate: a.commissionRate, status: a.status === 'ACTIVE',
    });
    setDrawerOpen(true);
  };

  const onSubmit = (values: any): void => {
    if (editing) {
      updateAgent(editing.id, {
        name: values.name, phone: values.phone, email: values.email, branch: values.branch,
        territory: values.territory, products: values.products, commissionRate: values.commissionRate,
        status: values.status ? 'ACTIVE' : 'INACTIVE',
      }, actor);
      message.success(`${values.name} updated`);
    } else {
      addAgent({
        code: values.code, name: values.name, phone: values.phone, email: values.email,
        branch: values.branch, territory: values.territory, products: values.products,
        commissionRate: values.commissionRate, status: values.status ? 'ACTIVE' : 'INACTIVE',
        joinedOn: new Date().toISOString(), sourced: 0, disbursedValue: 0, commissionEarned: 0, commissionPending: 0,
      }, actor);
      message.success(`${values.name} onboarded — mobile app OTP login enabled on ${values.phone}`);
    }
    setDrawerOpen(false);
  };

  const columns: TableProps<Agent>['columns'] = [
    {
      title: 'Agent',
      dataIndex: 'name',
      render: (v: string, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar size={38} style={{ background: '#e0f2f1', color: '#0e7490', fontWeight: 700, fontSize: 13 }}>{initials(v)}</Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{r.code} · +91 {r.phone}</div>
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    { title: 'Territory', dataIndex: 'territory', width: 150, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}><EnvironmentOutlined style={{ marginRight: 6, color: '#94a3b8' }} />{v}</span> },
    { title: 'Branch', dataIndex: 'branch', width: 175, render: (v: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{v}</span> },
    { title: 'Products', dataIndex: 'products', width: 150, render: (p: LoanType[]) => <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>{(p ?? []).map((t) => <LoanTypeTag key={t} type={t} />)}</span> },
    { title: 'Sourced', dataIndex: 'sourced', width: 90, align: 'center', render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{v ?? 0}</span>, sorter: (a, b) => (a.sourced ?? 0) - (b.sourced ?? 0) },
    { title: 'Disbursed', dataIndex: 'disbursedValue', width: 115, align: 'right', render: (v: number) => <span className="tnum">{inrCompact(v ?? 0)}</span>, sorter: (a, b) => (a.disbursedValue ?? 0) - (b.disbursedValue ?? 0) },
    { title: 'Rate', dataIndex: 'commissionRate', width: 80, align: 'right', render: (v: number) => <span className="tnum">{v ?? 0}%</span> },
    {
      title: 'Commission',
      key: 'commission',
      width: 150,
      align: 'right',
      render: (_, r) => (
        <div style={{ textAlign: 'right' }}>
          <div className="tnum" style={{ fontWeight: 600, color: '#0f766e' }}>{inr(r.commissionEarned ?? 0)}</div>
          {(r.commissionPending ?? 0) > 0 && <div className="tnum" style={{ fontSize: 11, color: '#b45309' }}>{inr(r.commissionPending)} pending</div>}
        </div>
      ),
      sorter: (a, b) => (a.commissionEarned ?? 0) - (b.commissionEarned ?? 0),
    },
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
            onChange={() => { toggleAgentStatus(r.id, actor); message.success(`${r.name} ${r.status === 'ACTIVE' ? 'deactivated' : 'activated'}`); }}
          />
        </div>
      ),
    },
  ];

  const activeCount = agentList.filter((a: any) => a.status === 'ACTIVE').length;
  const totalDisbursed = agentList.reduce((s: number, a: any) => s + (a.disbursedValue ?? 0), 0);
  const commissionPaid = agentList.reduce((s: number, a: any) => s + (a.commissionEarned ?? 0), 0);
  const commissionPending = agentList.reduce((s: number, a: any) => s + (a.commissionPending ?? 0), 0);

  const handleExport = (): void => {
    exportCsv(
      `agents-${new Date().toISOString().slice(0, 10)}`,
      ['Code', 'Name', 'Phone', 'Email', 'Branch', 'Territory', 'Products', 'Sourced', 'Disbursed', 'Rate %', 'Commission Earned', 'Commission Pending', 'Status'],
      rows.map((a: any) => [a.code, a.name, a.phone, a.email, a.branch, a.territory, (a.products ?? []).join(' / '), a.sourced ?? 0, a.disbursedValue ?? 0, a.commissionRate ?? 0, a.commissionEarned ?? 0, a.commissionPending ?? 0, a.status]),
    );
  };

  return (
    <div>
      <PageHeader
        title="Agent Management"
        subtitle="Onboard field agents, assign territories and track commissions"
        extra={
          <>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Onboard Agent</Button>
          </>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Active Agents" value={activeCount} sub={`${agentList.length} total`} icon={<TeamOutlined />} tint="#0e7490" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Disbursed via Agents" value={inrCompact(totalDisbursed)} sub="lifetime" icon={<DollarOutlined />} tint="#0284c7" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Commission Paid" value={inrCompact(commissionPaid)} sub="to date" icon={<DollarOutlined />} tint="#047857" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Commission Pending" value={inrCompact(commissionPending)} sub="accrued, unpaid" icon={<DollarOutlined />} tint="#d97706" /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search name, code, phone, territory…"
            allowClear
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]}
          />
        </div>
        <Table<Agent>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={loading}
          scroll={{ x: 1280 }}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} agents` }}
        />
      </Card>

      <Drawer
        title={<span><UserAddOutlined style={{ marginRight: 8, color: '#0e7490' }} />{editing ? `Edit Agent — ${editing.name}` : 'Onboard Agent'}</span>}
        width={460}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>{editing ? 'Save Changes' : 'Onboard Agent'}</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
          {!editing && (
            <Form.Item label="Agent Code" name="code" rules={[{ required: true, message: 'Enter an agent code' }]}>
              <Input placeholder="e.g. FSA-061" />
            </Form.Item>
          )}
          <Form.Item label="Full Name" name="name" rules={[{ required: true, message: 'Enter the full name' }]}>
            <Input placeholder="e.g. Suresh Nair" />
          </Form.Item>
          <Form.Item label="Phone Number (OTP login)" name="phone" rules={[{ required: true, message: 'Enter the mobile number' }, { pattern: /^[6-9]\d{9}$/, message: 'Valid 10-digit mobile required' }]}>
            <Input addonBefore="+91" maxLength={10} placeholder="98XXXXXXXX" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
            <Input placeholder="name@fuehrer-nbfc.in" />
          </Form.Item>
          <Form.Item label="Branch" name="branch" rules={[{ required: true, message: 'Select branch' }]}>
            <Select showSearch placeholder="Select branch" options={branches.map((b) => ({ value: b.name, label: b.name }))} />
          </Form.Item>
          <Form.Item label="Territory" name="territory" rules={[{ required: true, message: 'Assign a territory' }]}>
            <Input placeholder="e.g. Mumbai West" />
          </Form.Item>
          <Form.Item label="Products" name="products" rules={[{ required: true, message: 'Select at least one product' }]}>
            <Select mode="multiple" options={PRODUCT_OPTIONS} />
          </Form.Item>
          <Form.Item label="Commission Rate (% of disbursed)" name="commissionRate" rules={[{ required: true, message: 'Set the commission rate' }]}>
            <InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} addonAfter="%" />
          </Form.Item>
          <Form.Item label="Status" name="status" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          {editing && (
            <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafd', border: '1px solid #eef1f7', borderRadius: 10, padding: '10px 14px' }}>
              <Tag color="blue" style={{ borderRadius: 6 }}>Since {fmtDate(editing.joinedOn)}</Tag>
              Sourced <strong>{editing.sourced}</strong> · Disbursed <strong>{inrCompact(editing.disbursedValue)}</strong>
            </div>
          )}
        </Form>
      </Drawer>
    </div>
  );
};

export default AgentManagement;
import React, { useState } from 'react';
import { App, Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch, Table, Tabs, Tag } from 'antd';
import {
  ApiOutlined, BankOutlined, BellOutlined, EditOutlined, SafetyOutlined, SettingOutlined, SaveOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { SectionTitle } from '../../components/InfoGrid';
import { LoanTypeTag } from '../../components/StatusTag';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import type { ProductConfig } from '../../types';
import { settingsApi } from '../../api/settings.api';

const panel: React.CSSProperties = { boxShadow: 'var(--shadow-card)' };

const Settings: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const logAudit = useAppStore((s) => s.logAudit);
  const productConfigs = useAppStore((s) => s.productConfigs);
  const updateProductConfig = useAppStore((s) => s.updateProductConfig);
  const actor = { name: user.name, role: user.role };

  const [editingProduct, setEditingProduct] = useState<ProductConfig | null>(null);
  const [productForm] = Form.useForm();

  const openProduct = (p: ProductConfig): void => {
    setEditingProduct(p);
    productForm.setFieldsValue({
      minAmount: p.minAmount, maxAmount: p.maxAmount, minRate: p.minRate, maxRate: p.maxRate,
      maxTenure: p.maxTenure, processingFeePct: p.processingFeePct, maxLtv: p.maxLtv, active: p.active,
    });
  };
  React.useEffect(() => {
    settingsApi.getAll().catch(() => {});
  }, []);

  const submitProduct = (values: any): void => {
    if (!editingProduct) return;
    updateProductConfig(editingProduct.key, {
      minAmount: values.minAmount, maxAmount: values.maxAmount, minRate: values.minRate, maxRate: values.maxRate,
      maxTenure: values.maxTenure, processingFeePct: values.processingFeePct,
      maxLtv: editingProduct.key === 'CDL' ? undefined : values.maxLtv, active: values.active,
    }, actor);
    message.success(`${editingProduct.product} updated`);
    setEditingProduct(null);
  };

  const saved = (section: string): void => {
    logAudit({ user: user.name, role: String(user.role), module: 'Settings', action: `Updated ${section}`, entity: 'Platform Config' });
    message.success(`${section} saved`);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform configuration — organization, products, workflow and security" />

      <Tabs
        defaultActiveKey="org"
        items={[
          {
            key: 'org',
            label: <span><BankOutlined /> Organization</span>,
            children: (
              <Card variant="borderless" style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <SectionTitle>Registered Entity</SectionTitle>
                <Form
                  layout="vertical"
                  style={{ maxWidth: 760 }}
                  initialValues={{
                    name: 'Fuehrer Finserv Private Limited',
                    brand: 'FUEHRER NBFC',
                    cin: 'U65990MH2019PLC328880',
                    rbi: 'N-13.02371',
                    address: '12th Floor, Lotus Corporate Park, Goregaon East, Mumbai 400063',
                    email: 'support@fuehrer-nbfc.in',
                    phone: '1800 266 4422',
                  }}
                  onFinish={() => saved('Organization Profile')}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item label="Legal Name" name="name"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Brand Name" name="brand"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="CIN" name="cin"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="RBI CoR Number" name="rbi"><Input /></Form.Item></Col>
                    <Col xs={24}><Form.Item label="Registered Office" name="address"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Support Email" name="email"><Input /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Support Phone" name="phone"><Input /></Form.Item></Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Changes</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'products',
            label: <span><SettingOutlined /> Loan Products</span>,
            children: (
              <Card variant="borderless" style={panel} styles={{ body: { padding: '8px 10px' } }}>
                <Table<ProductConfig>
                  dataSource={productConfigs}
                  rowKey="key"
                  size="middle"
                  pagination={false}
                  scroll={{ x: 980 }}
                  columns={[
                    { title: 'Product', dataIndex: 'product', render: (v: string, r) => <span><LoanTypeTag type={r.key} /> <span style={{ fontWeight: 600, marginLeft: 8 }}>{v}</span></span> },
                    { title: 'Min Ticket', dataIndex: 'minAmount', align: 'right', render: (v: number) => <span className="tnum">₹{v.toLocaleString('en-IN')}</span> },
                    { title: 'Max Ticket', dataIndex: 'maxAmount', align: 'right', render: (v: number) => <span className="tnum">₹{v.toLocaleString('en-IN')}</span> },
                    { title: 'Rate Band', key: 'rate', render: (_, r) => <span className="tnum">{r.minRate}% – {r.maxRate}%</span> },
                    { title: 'Max Tenure', dataIndex: 'maxTenure', align: 'right', render: (v: number) => <span className="tnum">{v} mo</span> },
                    { title: 'Proc. Fee', dataIndex: 'processingFeePct', align: 'right', render: (v: number) => <span className="tnum">{v}%</span> },
                    { title: 'Max LTV', dataIndex: 'maxLtv', align: 'right', render: (v?: number) => v === undefined ? <span style={{ color: '#cbd5e1' }}>n/a</span> : <span className="tnum" style={{ fontWeight: 600 }}>{v}%</span> },
                    {
                      title: 'Status', dataIndex: 'active', width: 100,
                      render: (v: boolean, r) => <Switch checked={v} size="small" onChange={(c) => updateProductConfig(r.key, { active: c }, actor)} />,
                    },
                    {
                      title: 'Action', key: 'action', width: 90, fixed: 'right',
                      render: (_, r) => <Button size="small" icon={<EditOutlined />} onClick={() => openProduct(r)}>Edit</Button>,
                    },
                  ]}
                />
                <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>
                  Rate bands, fees and LTV limits apply to new sanctions only. Existing loans retain contracted terms.
                </div>
              </Card>
            ),
          },
          {
            key: 'workflow',
            label: <span><ApiOutlined /> Workflow</span>,
            children: (
              <Card variant="borderless" style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form
                  layout="vertical"
                  style={{ maxWidth: 640 }}
                  initialValues={{ creditTat: 48, autoAssign: true, makerChecker: true, bureauFloor: 600, foirCeiling: 55, autoNpa: true }}
                  onFinish={() => saved('Workflow Rules')}
                >
                  <SectionTitle>Credit &amp; Decisioning</SectionTitle>
                  <Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item label="Credit TAT Target (hours)" name="creditTat"><InputNumber style={{ width: '100%' }} min={4} max={168} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Minimum Bureau Score" name="bureauFloor"><InputNumber style={{ width: '100%' }} min={300} max={900} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="FOIR Ceiling (%)" name="foirCeiling"><InputNumber style={{ width: '100%' }} min={30} max={80} /></Form.Item></Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Auto-assign to credit queue" name="autoAssign" valuePropName="checked"><Switch /></Form.Item>
                    </Col>
                  </Row>
                  <SectionTitle style={{ marginTop: 10 }}>Disbursal &amp; LMS</SectionTitle>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Maker-checker on disbursal" name="makerChecker" valuePropName="checked"><Switch /></Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Auto-flag NPA at DPD 90" name="autoNpa" valuePropName="checked"><Switch /></Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Changes</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'notifications',
            label: <span><BellOutlined /> Notifications</span>,
            children: (
              <Card variant="borderless" style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form layout="horizontal" style={{ maxWidth: 560 }} onFinish={() => saved('Notification Preferences')}
                  initialValues={{ smsCustomer: true, emailTeam: true, emiReminder: true, bounceAlert: true, npaDigest: true }}>
                  {[
                    { name: 'smsCustomer', label: 'SMS to customers on status changes' },
                    { name: 'emailTeam', label: 'Email digests to credit & finance teams' },
                    { name: 'emiReminder', label: 'EMI reminder (T-3 days) to customers' },
                    { name: 'bounceAlert', label: 'Instant alert on NACH bounce' },
                    { name: 'npaDigest', label: 'Weekly NPA & recovery digest to management' },
                  ].map((x) => (
                    <Form.Item key={x.name} name={x.name} valuePropName="checked" label={x.label} labelCol={{ span: 18 }} wrapperCol={{ span: 6 }} labelAlign="left" colon={false}>
                      <Switch />
                    </Form.Item>
                  ))}
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Changes</Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'security',
            label: <span><SafetyOutlined /> Security</span>,
            children: (
              <Card variant="borderless" style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form layout="vertical" style={{ maxWidth: 640 }} onFinish={() => saved('Security Policy')}
                  initialValues={{ session: 30, otpExpiry: 5, otpRetries: 3, ipMode: 'allow-office', enforce2fa: true }}>
                  <Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item label="Session Timeout (minutes)" name="session"><InputNumber style={{ width: '100%' }} min={5} max={240} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="OTP Expiry (minutes)" name="otpExpiry"><InputNumber style={{ width: '100%' }} min={1} max={15} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Max OTP Retries" name="otpRetries"><InputNumber style={{ width: '100%' }} min={1} max={5} /></Form.Item></Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Network Policy" name="ipMode">
                        <Select options={[
                          { value: 'allow-office', label: 'Office networks only (10.24.x / 172.16.x)' },
                          { value: 'allow-vpn', label: 'Office + VPN' },
                          { value: 'open', label: 'Any network (not recommended)' },
                        ]} />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Enforce OTP second factor for admin logins" name="enforce2fa" valuePropName="checked"><Switch /></Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Changes</Button>
                </Form>
                <div style={{ marginTop: 18, fontSize: 12, color: '#94a3b8' }}>
                  <Tag color="green" style={{ borderRadius: 6 }}>ISO 27001</Tag>
                  <Tag color="green" style={{ borderRadius: 6 }}>SOC 2 Type II</Tag>
                  <Tag color="blue" style={{ borderRadius: 6 }}>RBI IT Framework Compliant</Tag>
                  Data encrypted at rest (AES-256) and in transit (TLS 1.3). Audit logs are immutable.
                </div>
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title={<span><SettingOutlined style={{ marginRight: 8, color: '#0284c7' }} />Edit Product — {editingProduct?.product}</span>}
        width={460}
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => productForm.submit()}>Save Changes</Button>
          </div>
        }
      >
        {editingProduct && (
          <Form form={productForm} layout="vertical" onFinish={submitProduct} requiredMark={false}>
            <SectionTitle>Ticket Size</SectionTitle>
            <Row gutter={12}>
              <Col span={12}><Form.Item label="Min Amount (₹)" name="minAmount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1000} step={1000} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Max Amount (₹)" name="maxAmount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1000} step={10000} /></Form.Item></Col>
            </Row>
            <SectionTitle style={{ marginTop: 6 }}>Interest &amp; Fees</SectionTitle>
            <Row gutter={12}>
              <Col span={12}><Form.Item label="Min Rate (% p.a.)" name="minRate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={36} step={0.25} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Max Rate (% p.a.)" name="maxRate" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={36} step={0.25} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Max Tenure (months)" name="maxTenure" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} max={360} /></Form.Item></Col>
              <Col span={12}><Form.Item label="Processing Fee (%)" name="processingFeePct" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} /></Form.Item></Col>
            </Row>
            {editingProduct.key !== 'CDL' && (
              <>
                <SectionTitle style={{ marginTop: 6 }}>Collateral</SectionTitle>
                <Form.Item label="Max LTV (%)" name="maxLtv" rules={[{ required: true, message: 'Set the LTV cap' }]} extra="Maximum loan-to-value against collateral for new sanctions.">
                  <InputNumber style={{ width: '100%' }} min={10} max={90} />
                </Form.Item>
              </>
            )}
            <Form.Item label="Product Active" name="active" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  );
};

export default Settings;

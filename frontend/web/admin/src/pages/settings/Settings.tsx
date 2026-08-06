import React, { useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import {
  ApiOutlined,
  BankOutlined,
  BellOutlined,
  EditOutlined,
  SafetyOutlined,
  SettingOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { SectionTitle } from '../../components/InfoGrid';
import { LoanTypeTag } from '../../components/StatusTag';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import type { ProductConfig } from '../../types';
import { loadSettings, saveSettings } from '../../api/settings.api';
import { productConfigsApi } from '../../api/product-configs.api';
import { USE_MOCK } from '../../config';

const panel: React.CSSProperties = {};

// Seed values for each settings section. These are the fallback the forms show
// until persisted values load, and the base that loaded values merge over so a
// partially-saved section still fills every field.
const DEFAULTS = {
  'org.profile': {
    name: 'Fuehrer Finserv Private Limited',
    brand: 'FUEHRER NBFC',
    cin: 'U65990MH2019PLC328880',
    rbi: 'N-13.02371',
    address: '12th Floor, Lotus Corporate Park, Goregaon East, Mumbai 400063',
    email: 'support@fuehrer-nbfc.in',
    phone: '1800 266 4422',
  },
  'workflow.rules': {
    creditTat: 48,
    autoAssign: true,
    makerChecker: true,
    bureauFloor: 600,
    foirCeiling: 55,
    autoNpa: true,
  },
  'notifications.prefs': {
    smsCustomer: true,
    emailTeam: true,
    emiReminder: true,
    bounceAlert: true,
    npaDigest: true,
  },
  'security.policy': {
    session: 30,
    otpExpiry: 5,
    otpRetries: 3,
    ipMode: 'allow-office',
    enforce2fa: true,
  },
} as const;

const Settings: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const logAudit = useAppStore((s) => s.logAudit);
  const productConfigs = useAppStore((s) => s.productConfigs);
  const updateProductConfig = useAppStore((s) => s.updateProductConfig);
  const actor = { name: user.name, role: user.role };

  const [editingProduct, setEditingProduct] = useState<ProductConfig | null>(null);
  const [productForm] = Form.useForm();
  const [orgForm] = Form.useForm();
  const [workflowForm] = Form.useForm();
  const [notifForm] = Form.useForm();
  const [securityForm] = Form.useForm();

  const openProduct = (p: ProductConfig): void => {
    setEditingProduct(p);
    productForm.setFieldsValue({
      minAmount: p.minAmount,
      maxAmount: p.maxAmount,
      minRate: p.minRate,
      maxRate: p.maxRate,
      maxTenure: p.maxTenure,
      processingFeePct: p.processingFeePct,
      maxLtv: p.maxLtv,
      active: p.active,
    });
  };
  // Hydrate each section form from persisted settings on mount. Forms render
  // with DEFAULTS immediately (see forceRender below), then get overwritten
  // with any saved values once they load — so a save round-trips on refresh.
  React.useEffect(() => {
    let cancelled = false;
    void loadSettings().then((map) => {
      if (cancelled) return;
      const forms: Record<keyof typeof DEFAULTS, ReturnType<typeof Form.useForm>[0]> = {
        'org.profile': orgForm,
        'workflow.rules': workflowForm,
        'notifications.prefs': notifForm,
        'security.policy': securityForm,
      };
      (Object.keys(forms) as (keyof typeof DEFAULTS)[]).forEach((key) => {
        const saved = map[key];
        if (saved && typeof saved === 'object') {
          forms[key].setFieldsValue({ ...DEFAULTS[key], ...(saved as object) });
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [orgForm, workflowForm, notifForm, securityForm]);

  const submitProduct = async (values: any): Promise<void> => {
    if (!editingProduct) return;
    const patch = {
      minAmount: values.minAmount,
      maxAmount: values.maxAmount,
      minRate: values.minRate,
      maxRate: values.maxRate,
      maxTenure: values.maxTenure,
      processingFeePct: values.processingFeePct,
      maxLtv: editingProduct.key === 'CDL' ? undefined : values.maxLtv,
      active: values.active,
    };
    // Product config has its own endpoint (PATCH /product-configs/:productType),
    // separate from the key/value settings store. A failed write must abort with
    // an error, never a fake "updated". Local-only recording is legitimate solely
    // under VITE_USE_MOCK.
    if (!USE_MOCK) {
      try {
        await productConfigsApi.update(editingProduct.key, patch);
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        message.error(
          e.response?.data?.message ?? `Could not save ${editingProduct.product} — please retry.`,
        );
        return;
      }
    }
    updateProductConfig(editingProduct.key, patch, actor);
    message.success(`${editingProduct.product} updated`);
    setEditingProduct(null);
  };

  // Persist a settings section before anything is confirmed. In live mode a
  // failed write must surface an error and abort — never a fake "saved" over a
  // change the server never stored. Under VITE_USE_MOCK saveSettings writes to
  // localStorage so the change round-trips on reload. Returns false to stop.
  const persist = async (key: string, section: string, values: unknown): Promise<boolean> => {
    try {
      await saveSettings(key, values);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message ?? `Could not save ${section} — please retry.`);
      return false;
    }
    return true;
  };

  const saved = async (key: string, section: string, values: unknown): Promise<void> => {
    if (!(await persist(key, section, values))) return;
    logAudit({
      user: user.name,
      role: String(user.role),
      module: 'Settings',
      action: `Updated ${section}`,
      entity: 'Platform Config',
    });
    message.success(`${section} saved`);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform configuration — organization, products, workflow and security"
      />

      <Tabs
        defaultActiveKey="org"
        items={[
          {
            key: 'org',
            forceRender: true,
            label: (
              <span>
                <BankOutlined /> Organization
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <SectionTitle>Registered Entity</SectionTitle>
                <Form
                  form={orgForm}
                  layout="vertical"
                  style={{ maxWidth: 760 }}
                  initialValues={DEFAULTS['org.profile']}
                  onFinish={(v) => saved('org.profile', 'Organization Profile', v)}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Legal Name" name="name">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Brand Name" name="brand">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="CIN" name="cin">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="RBI CoR Number" name="rbi">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Registered Office" name="address">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Support Email" name="email">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Support Phone" name="phone">
                        <Input />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save Changes
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'products',
            label: (
              <span>
                <SettingOutlined /> Loan Products
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '8px 10px' } }}>
                <Table<ProductConfig>
                  dataSource={productConfigs}
                  rowKey="key"
                  size="middle"
                  pagination={false}
                  scroll={{ x: 980 }}
                  columns={[
                    {
                      title: 'Product',
                      dataIndex: 'product',
                      render: (v: string, r) => (
                        <span>
                          <LoanTypeTag type={r.key} />{' '}
                          <span style={{ fontWeight: 600, marginLeft: 8 }}>{v}</span>
                        </span>
                      ),
                    },
                    {
                      title: 'Min Ticket',
                      dataIndex: 'minAmount',
                      align: 'right',
                      render: (v: number) => (
                        <span className="tnum">₹{v.toLocaleString('en-IN')}</span>
                      ),
                    },
                    {
                      title: 'Max Ticket',
                      dataIndex: 'maxAmount',
                      align: 'right',
                      render: (v: number) => (
                        <span className="tnum">₹{v.toLocaleString('en-IN')}</span>
                      ),
                    },
                    {
                      title: 'Rate Band',
                      key: 'rate',
                      render: (_, r) => (
                        <span className="tnum">
                          {r.minRate}% – {r.maxRate}%
                        </span>
                      ),
                    },
                    {
                      title: 'Max Tenure',
                      dataIndex: 'maxTenure',
                      align: 'right',
                      render: (v: number) => <span className="tnum">{v} mo</span>,
                    },
                    {
                      title: 'Proc. Fee',
                      dataIndex: 'processingFeePct',
                      align: 'right',
                      render: (v: number) => <span className="tnum">{v}%</span>,
                    },
                    {
                      title: 'Max LTV',
                      dataIndex: 'maxLtv',
                      align: 'right',
                      render: (v?: number) =>
                        v === undefined ? (
                          <span style={{ color: 'var(--ink-200)' }}>n/a</span>
                        ) : (
                          <span className="tnum u-semibold">{v}%</span>
                        ),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'active',
                      width: 100,
                      render: (v: boolean, r) => (
                        <Switch
                          checked={v}
                          size="small"
                          onChange={(c) => updateProductConfig(r.key, { active: c }, actor)}
                        />
                      ),
                    },
                    {
                      title: 'Action',
                      key: 'action',
                      width: 90,
                      render: (_, r) => (
                        <Button size="small" icon={<EditOutlined />} onClick={() => openProduct(r)}>
                          Edit
                        </Button>
                      ),
                    },
                  ]}
                />
                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink-400)' }}>
                  Rate bands, fees and LTV limits apply to new sanctions only. Existing loans retain
                  contracted terms.
                </div>
              </Card>
            ),
          },
          {
            key: 'workflow',
            forceRender: true,
            label: (
              <span>
                <ApiOutlined /> Workflow
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form
                  form={workflowForm}
                  layout="vertical"
                  style={{ maxWidth: 640 }}
                  initialValues={DEFAULTS['workflow.rules']}
                  onFinish={(v) => saved('workflow.rules', 'Workflow Rules', v)}
                >
                  <SectionTitle>Credit &amp; Decisioning</SectionTitle>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Credit TAT Target (hours)" name="creditTat">
                        <InputNumber style={{ width: '100%' }} min={4} max={168} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Minimum Bureau Score" name="bureauFloor">
                        <InputNumber style={{ width: '100%' }} min={300} max={900} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="FOIR Ceiling (%)" name="foirCeiling">
                        <InputNumber style={{ width: '100%' }} min={30} max={80} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Auto-assign to credit queue"
                        name="autoAssign"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <SectionTitle>Disbursal &amp; LMS</SectionTitle>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Maker-checker on disbursal"
                        name="makerChecker"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Auto-flag NPA at DPD 90"
                        name="autoNpa"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save Changes
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'notifications',
            forceRender: true,
            label: (
              <span>
                <BellOutlined /> Notifications
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form
                  form={notifForm}
                  layout="horizontal"
                  style={{ maxWidth: 560 }}
                  onFinish={(v) => saved('notifications.prefs', 'Notification Preferences', v)}
                  initialValues={DEFAULTS['notifications.prefs']}
                >
                  {[
                    { name: 'smsCustomer', label: 'SMS to customers on status changes' },
                    { name: 'emailTeam', label: 'Email digests to credit & finance teams' },
                    { name: 'emiReminder', label: 'EMI reminder (T-3 days) to customers' },
                    { name: 'bounceAlert', label: 'Instant alert on NACH bounce' },
                    { name: 'npaDigest', label: 'Weekly NPA & recovery digest to management' },
                  ].map((x) => (
                    <Form.Item
                      key={x.name}
                      name={x.name}
                      valuePropName="checked"
                      label={x.label}
                      labelCol={{ span: 18 }}
                      wrapperCol={{ span: 6 }}
                      labelAlign="left"
                      colon={false}
                    >
                      <Switch />
                    </Form.Item>
                  ))}
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save Changes
                  </Button>
                </Form>
              </Card>
            ),
          },
          {
            key: 'security',
            forceRender: true,
            label: (
              <span>
                <SafetyOutlined /> Security
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '22px 24px' } }}>
                <Form
                  form={securityForm}
                  layout="vertical"
                  style={{ maxWidth: 640 }}
                  onFinish={(v) => saved('security.policy', 'Security Policy', v)}
                  initialValues={DEFAULTS['security.policy']}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="Session Timeout (minutes)" name="session">
                        <InputNumber style={{ width: '100%' }} min={5} max={240} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="OTP Expiry (minutes)" name="otpExpiry">
                        <InputNumber style={{ width: '100%' }} min={1} max={15} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Max OTP Retries" name="otpRetries">
                        <InputNumber style={{ width: '100%' }} min={1} max={5} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="Network Policy" name="ipMode">
                        <Select
                          options={[
                            {
                              value: 'allow-office',
                              label: 'Office networks only (10.24.x / 172.16.x)',
                            },
                            { value: 'allow-vpn', label: 'Office + VPN' },
                            { value: 'open', label: 'Any network (not recommended)' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item
                        label="Enforce OTP second factor for admin logins"
                        name="enforce2fa"
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                    Save Changes
                  </Button>
                </Form>
                <div style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-400)' }}>
                  <Tag color="green" style={{ borderRadius: 6 }}>
                    ISO 27001
                  </Tag>
                  <Tag color="green" style={{ borderRadius: 6 }}>
                    SOC 2 Type II
                  </Tag>
                  <Tag color="blue" style={{ borderRadius: 6 }}>
                    RBI IT Framework Compliant
                  </Tag>
                  Data encrypted at rest (AES-256) and in transit (TLS 1.3). Audit logs are
                  immutable.
                </div>
              </Card>
            ),
          },
        ]}
      />

      <Drawer
        title={
          <span>
            <SettingOutlined style={{ marginRight: 8, color: 'var(--accent)' }} />
            Edit Product — {editingProduct?.product}
          </span>
        }
        size={460}
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setEditingProduct(null)}>Cancel</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => productForm.submit()}>
              Save Changes
            </Button>
          </div>
        }
      >
        {editingProduct && (
          <Form form={productForm} layout="vertical" onFinish={submitProduct} requiredMark={false}>
            <SectionTitle>Ticket Size</SectionTitle>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Min Amount (₹)" name="minAmount" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1000} step={1000} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Max Amount (₹)" name="maxAmount" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1000} step={10000} />
                </Form.Item>
              </Col>
            </Row>
            <SectionTitle>Interest &amp; Fees</SectionTitle>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="Min Rate (% p.a.)" name="minRate" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} max={36} step={0.25} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Max Rate (% p.a.)" name="maxRate" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} max={36} step={0.25} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Max Tenure (months)"
                  name="maxTenure"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} min={1} max={360} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Processing Fee (%)"
                  name="processingFeePct"
                  rules={[{ required: true }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} max={5} step={0.1} />
                </Form.Item>
              </Col>
            </Row>
            {editingProduct.key !== 'CDL' && (
              <>
                <SectionTitle>Collateral</SectionTitle>
                <Form.Item
                  label="Max LTV (%)"
                  name="maxLtv"
                  rules={[{ required: true, message: 'Set the LTV cap' }]}
                  extra="Maximum loan-to-value against collateral for new sanctions."
                >
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

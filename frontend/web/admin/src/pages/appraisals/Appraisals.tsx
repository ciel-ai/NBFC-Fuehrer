import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, App, Button, Card, Col, Drawer, Form, Input, InputNumber, Row, Segmented, Select, Table,
} from 'antd';
import type { TableProps } from 'antd';
import {
  GoldOutlined, HomeOutlined, SafetyCertificateOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { StatusTag } from '../../components/StatusTag';
import { inr } from '../../utils/format';
import type { LoanApplication } from '../../types';

type AppraisalScope = 'GOLD' | 'HOUSING';

const isAppraised = (a: LoanApplication): boolean =>
  a.loanType === 'GOLD' ? !!a.collateral?.gold?.valuedBy : !!a.collateral?.property?.valuedBy;

const Appraisals: React.FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const saveGoldAppraisal = useAppStore((s) => s.saveGoldAppraisal);
  const savePropertyAppraisal = useAppStore((s) => s.savePropertyAppraisal);
  const scope = scopedLoanType(user.role);

  const [seg, setSeg] = useState<AppraisalScope>('GOLD');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPRAISED' | undefined>();
  const [active, setActive] = useState<LoanApplication | null>(null);
  const [form] = Form.useForm();
  const actor = { name: user.name, role: user.role };

  // if role is scoped to a collateral product, lock the segment
  useEffect(() => {
    if (scope === 'GOLD' || scope === 'HOUSING') setSeg(scope);
  }, [scope]);

  const collateralApps = useMemo(
    () => applications.filter((a) => (a.loanType === 'GOLD' || a.loanType === 'HOUSING') && (!scope || a.loanType === scope)),
    [applications, scope],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collateralApps.filter((a) => {
      if (a.loanType !== seg) return false;
      if (statusFilter === 'PENDING' && isAppraised(a)) return false;
      if (statusFilter === 'APPRAISED' && !isAppraised(a)) return false;
      if (q && !`${a.appNumber} ${a.customer.name} ${a.customer.mobile}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [collateralApps, seg, search, statusFilter]);

  // live LTV preview in the drawer
  const [preview, setPreview] = useState<{ valuation: number; ltv: number }>({ valuation: 0, ltv: 0 });
  const recompute = (): void => {
    if (!active) return;
    const v = form.getFieldsValue();
    if (active.loanType === 'GOLD') {
      const valuation = Math.round((v.netWeightGrams ?? 0) * (v.ratePerGram ?? 0));
      const ltv = valuation ? Math.round((active.loan.amount / valuation) * 100) : 0;
      form.setFieldsValue({ valuation });
      setPreview({ valuation, ltv });
    } else {
      const valuation = v.marketValue ?? 0;
      const ltv = valuation ? Math.round((active.loan.amount / valuation) * 100) : 0;
      setPreview({ valuation, ltv });
    }
  };

  const openDrawer = (a: LoanApplication): void => {
    setActive(a);
    if (a.loanType === 'GOLD') {
      const g = a.collateral?.gold;
      form.setFieldsValue({
        grossWeightGrams: g?.grossWeightGrams, netWeightGrams: g?.netWeightGrams,
        purityKarat: g?.purityKarat ?? 22, ratePerGram: g?.ratePerGram ?? 6200,
        itemsDescription: g?.items?.[0]?.description ?? 'Assorted gold ornaments',
        valuation: g?.valuation,
      });
      setPreview({ valuation: g?.valuation ?? 0, ltv: g?.ltv ?? 0 });
    } else {
      const p = a.collateral?.property;
      form.setFieldsValue({
        type: p?.type ?? 'Flat',
        address: p?.address ?? `${a.customer.currentAddress.line1}, ${a.customer.currentAddress.city}, ${a.customer.currentAddress.state} — ${a.customer.currentAddress.pincode}`,
        marketValue: p?.marketValue, builder: p?.builder, constructionStage: p?.constructionStage ?? 'Ready to Move',
      });
      setPreview({ valuation: p?.marketValue ?? 0, ltv: p?.ltv ?? 0 });
    }
  };

  const submit = (values: any): void => {
    if (!active) return;
    if (active.loanType === 'GOLD') {
      const valuation = Math.round((values.netWeightGrams ?? 0) * (values.ratePerGram ?? 0));
      const ltv = valuation ? Math.round((active.loan.amount / valuation) * 100) : 0;
      saveGoldAppraisal(active.id, {
        grossWeightGrams: values.grossWeightGrams,
        netWeightGrams: values.netWeightGrams,
        purityKarat: values.purityKarat,
        ratePerGram: values.ratePerGram,
        valuation,
        ltv,
        items: [{ description: values.itemsDescription, weightGrams: values.netWeightGrams }],
      }, actor);
      message.success(`Gold appraisal saved for ${active.appNumber} · LTV ${ltv}%`);
    } else {
      const ltv = values.marketValue ? Math.round((active.loan.amount / values.marketValue) * 100) : 0;
      savePropertyAppraisal(active.id, {
        type: values.type,
        address: values.address,
        marketValue: values.marketValue,
        ltv,
        builder: values.builder,
        constructionStage: values.constructionStage,
      }, actor);
      message.success(`Property assessment saved for ${active.appNumber} · LTV ${ltv}%`);
    }
    setActive(null);
  };

  const columns: TableProps<LoanApplication>['columns'] = [
    { title: 'Application', dataIndex: 'appNumber', width: 165, render: (v: string) => <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 12.5 }}>{v}</span> },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      render: (_: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.customer.name}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>+91 {r.customer.mobile}</div>
        </div>
      ),
    },
    { title: 'Requested', dataIndex: ['loan', 'amount'], align: 'right', width: 130, render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span> },
    {
      title: seg === 'GOLD' ? 'Valuation' : 'Market Value',
      key: 'valuation',
      width: 140,
      align: 'right',
      render: (_, r) => {
        const val = r.loanType === 'GOLD' ? r.collateral?.gold?.valuation : r.collateral?.property?.marketValue;
        return val ? <span className="tnum">{inr(val)}</span> : <span style={{ color: '#cbd5e1' }}>—</span>;
      },
    },
    {
      title: 'LTV',
      key: 'ltv',
      width: 90,
      align: 'right',
      render: (_, r) => {
        const ltv = r.loanType === 'GOLD' ? r.collateral?.gold?.ltv : r.collateral?.property?.ltv;
        if (ltv === undefined) return <span style={{ color: '#cbd5e1' }}>—</span>;
        const cap = r.loanType === 'GOLD' ? 75 : 80;
        return <span style={{ fontWeight: 700, color: ltv <= cap ? '#16a34a' : '#dc2626' }}>{ltv}%</span>;
      },
    },
    { title: 'Stage', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Appraisal',
      key: 'appraisal',
      width: 120,
      render: (_, r) => <StatusTag status={isAppraised(r) ? 'COMPLETED' : 'PENDING'} />,
    },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      fixed: 'right',
      render: (_, r) => (
        <Button
          size="small"
          type={isAppraised(r) ? 'default' : 'primary'}
          icon={r.loanType === 'GOLD' ? <GoldOutlined /> : <HomeOutlined />}
          onClick={(e) => { e.stopPropagation(); openDrawer(r); }}
        >
          {isAppraised(r) ? 'Update' : 'Appraise'}
        </Button>
      ),
    },
  ];

  const pendingGold = collateralApps.filter((a) => a.loanType === 'GOLD' && !isAppraised(a)).length;
  const pendingProp = collateralApps.filter((a) => a.loanType === 'HOUSING' && !isAppraised(a)).length;
  const cap = seg === 'GOLD' ? 75 : 80;

  return (
    <div>
      <PageHeader
        title="Collateral Appraisals"
        subtitle="Ops workbench — record gold valuations and property assessments"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Gold — Pending" value={pendingGold} sub="awaiting appraisal" icon={<GoldOutlined />} tint="#b45309" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Property — Pending" value={pendingProp} sub="awaiting assessment" icon={<HomeOutlined />} tint="#6d4ea8" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Gold Files" value={collateralApps.filter((a) => a.loanType === 'GOLD').length} sub="total gold applications" icon={<GoldOutlined />} tint="#2563eb" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Property Files" value={collateralApps.filter((a) => a.loanType === 'HOUSING').length} sub="total housing applications" icon={<HomeOutlined />} tint="#0e7490" /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7', alignItems: 'center' }}>
          {!scope && (
            <Segmented
              value={seg}
              onChange={(v) => setSeg(v as AppraisalScope)}
              options={[
                { value: 'GOLD', label: 'Gold', icon: <GoldOutlined /> },
                { value: 'HOUSING', label: 'Property', icon: <HomeOutlined /> },
              ]}
            />
          )}
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search app no, customer, mobile…"
            allowClear
            style={{ width: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Appraisal status"
            allowClear
            style={{ width: 170 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ value: 'PENDING', label: 'Pending' }, { value: 'APPRAISED', label: 'Appraised' }]}
          />
        </div>
        <Table<LoanApplication>
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          className="row-link"
          scroll={{ x: 1080 }}
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} files` }}
        />
      </Card>

      <Drawer
        title={
          <span>
            <SafetyCertificateOutlined style={{ color: '#b45309', marginRight: 8 }} />
            {active?.loanType === 'GOLD' ? 'Gold Appraisal' : 'Property Assessment'} — {active?.appNumber}
          </span>
        }
        width={520}
        open={!!active}
        onClose={() => setActive(null)}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setActive(null)}>Cancel</Button>
            <Button type="primary" onClick={() => form.submit()}>Save Appraisal</Button>
          </div>
        }
      >
        {active && (
          <>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f8fafd', border: '1px solid #eef1f7', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{active.customer.name}</div>
                  <div style={{ fontSize: 12, color: '#7c8aa3' }}>{active.loan.purpose}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Requested</div>
                  <div className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{inr(active.loan.amount)}</div>
                </div>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={submit} requiredMark={false} onValuesChange={recompute}>
              {active.loanType === 'GOLD' ? (
                <>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item label="Gross Weight (g)" name="grossWeightGrams" rules={[{ required: true, message: 'Required' }]}><InputNumber style={{ width: '100%' }} min={0} step={0.1} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="Net Weight (g)" name="netWeightGrams" rules={[{ required: true, message: 'Required' }]}><InputNumber style={{ width: '100%' }} min={0} step={0.1} /></Form.Item></Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item label="Purity" name="purityKarat" rules={[{ required: true }]}><Select options={[{ value: 18, label: '18K' }, { value: 20, label: '20K' }, { value: 22, label: '22K' }]} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="Rate / gram (₹)" name="ratePerGram" rules={[{ required: true, message: 'Required' }]}><InputNumber style={{ width: '100%' }} min={0} step={50} /></Form.Item></Col>
                  </Row>
                  <Form.Item label="Items Description" name="itemsDescription" rules={[{ required: true, message: 'Describe the pledged items' }]}>
                    <Input placeholder="e.g. 2 bangles, 1 chain, 3 rings" />
                  </Form.Item>
                  <Form.Item label="Valuation (₹) — auto" name="valuation">
                    <InputNumber style={{ width: '100%' }} readOnly formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item label="Property Type" name="type" rules={[{ required: true }]}>
                    <Select options={['Flat', 'Independent House', 'Plot + Construction', 'Row House'].map((t) => ({ value: t, label: t }))} />
                  </Form.Item>
                  <Form.Item label="Property Address" name="address" rules={[{ required: true, message: 'Required' }]}>
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Row gutter={12}>
                    <Col span={12}><Form.Item label="Market Value (₹)" name="marketValue" rules={[{ required: true, message: 'Required' }]}><InputNumber style={{ width: '100%' }} min={0} step={50000} formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => Number(v?.replace(/[₹\s,]/g, '') ?? 0) as any} /></Form.Item></Col>
                    <Col span={12}><Form.Item label="Construction Stage" name="constructionStage"><Select options={['Ready to Move', 'Under Construction', 'Newly Constructed', 'Resale'].map((t) => ({ value: t, label: t }))} /></Form.Item></Col>
                  </Row>
                  <Form.Item label="Builder / Project (optional)" name="builder">
                    <Input placeholder="e.g. Lodha Group — Amara" />
                  </Form.Item>
                </>
              )}

              <SectionTitle style={{ marginTop: 6 }}>Computed</SectionTitle>
              <InfoGrid cols={2}>
                <InfoItem label={active.loanType === 'GOLD' ? 'Valuation' : 'Market Value'} value={<span className="tnum" style={{ fontWeight: 700 }}>{inr(preview.valuation)}</span>} />
                <InfoItem label="Loan-to-Value" value={<span style={{ fontWeight: 700, color: preview.ltv <= cap ? '#16a34a' : '#dc2626' }}>{preview.ltv}%</span>} />
              </InfoGrid>
              {preview.ltv > cap && (
                <Alert type="warning" showIcon style={{ marginTop: 14, borderRadius: 10 }} message={`LTV exceeds the ${cap}% policy cap`} description="The requested amount is high relative to the collateral value. Credit may need to reduce the sanction." />
              )}
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 12 }}>
                Recorded by {user.name}. Saved to the application's collateral record with a timestamp for the audit trail.
              </div>
            </Form>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Appraisals;

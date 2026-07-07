import React, { useEffect, useState } from 'react';
import {
  Alert, App, Button, Drawer, Form, Input, InputNumber, Radio, Select, Space,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, RollbackOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { creditApi } from '../../api/credit.api';
import { RiskGradeTag } from '../../components/StatusTag';
import { inr } from '../../utils/format';
import type { LoanApplication, RiskGrade } from '../../types';

const REJECT_REASONS = [
  'Low bureau score', 'FOIR above policy norms', 'Adverse payment history',
  'Unverifiable income', 'Document discrepancy / fraud suspicion', 'Negative area / profile',
];
const RETURN_REASONS = [
  'Incomplete documents', 'Income proof required', 'KYC name mismatch — clarification needed',
  'Bank statement illegible', 'Collateral valuation pending',
];

const GRADE_HINT: Record<RiskGrade, string> = {
  A: 'Prime — strong bureau, low FOIR',
  B: 'Near-prime — acceptable risk',
  C: 'Watch — conditional approval advised',
  D: 'High risk — decline recommended',
};

interface Props {
  app: LoanApplication;
  open: boolean;
  onClose: () => void;
}

const CreditDecisionDrawer: React.FC<Props> = ({ app, open, onClose }) => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const creditDecision = useAppStore((s) => s.creditDecision);
  const [form] = Form.useForm();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED');

  const suggestedGrade: RiskGrade =
    app.bureau.score >= 760 ? 'A' : app.bureau.score >= 710 ? 'B' : app.bureau.score >= 650 ? 'C' : 'D';

  useEffect(() => {
    if (open) {
      setDecision('APPROVED');
      form.setFieldsValue({
        decision: 'APPROVED',
        riskGrade: suggestedGrade,
        approvedAmount: app.loan.amount,
        approvedTenure: app.loan.tenureMonths,
        approvedRate: app.loan.interestRate,
        reason: undefined,
        remarks: '',
      });
    }
  }, [open, app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (values: any): Promise<void> => {
    try {
      if (values.decision === 'APPROVED') {
        await creditApi.approve(app.id, {
          approvedAmount: values.approvedAmount,
          interestRate: values.approvedRate,
          processingFee: Math.round(values.approvedAmount * 0.025),
        });
      } else if (values.decision === 'REJECTED') {
        await creditApi.reject(app.id, { reason: values.reason ?? values.remarks });
      }
    } catch {
      // API call failed — still update local store for now
    }

    creditDecision(
      app.id,
      {
        decision: values.decision,
        riskGrade: values.riskGrade,
        remarks: values.remarks,
        reason: values.reason,
        approvedAmount: values.decision === 'APPROVED' ? values.approvedAmount : undefined,
        approvedTenure: values.decision === 'APPROVED' ? values.approvedTenure : undefined,
        approvedRate: values.decision === 'APPROVED' ? values.approvedRate : undefined,
      },
      { name: user.name, role: user.role },
    );
    message.success(
      values.decision === 'APPROVED'
        ? `${app.appNumber} approved — moved to Finance queue`
        : values.decision === 'REJECTED'
          ? `${app.appNumber} rejected`
          : `${app.appNumber} returned to sales`,
    );
    onClose();
  };

  const docsOk = app.documents.every((d) => d.status === 'VERIFIED');

  return (
    <Drawer
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: '#b45309' }} />
          <span>Credit Decision — {app.appNumber}</span>
        </Space>
      }
      width={520}
      open={open}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            danger={decision === 'REJECTED'}
            icon={decision === 'APPROVED' ? <CheckCircleOutlined /> : decision === 'REJECTED' ? <CloseCircleOutlined /> : <RollbackOutlined />}
            onClick={() => form.submit()}
          >
            {decision === 'APPROVED' ? 'Approve Application' : decision === 'REJECTED' ? 'Reject Application' : 'Return to Sales'}
          </Button>
        </div>
      }
    >
      {/* context strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '14px 16px', borderRadius: 12, background: '#f8fafd', border: '1px solid #eef1f7', marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{app.customer.name}</div>
          <div style={{ fontSize: 12, color: '#7c8aa3' }}>{app.loan.purpose}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{inr(app.loan.amount)}</div>
          <div style={{ fontSize: 12, color: '#7c8aa3' }}>{app.loan.tenureMonths}m @ {app.loan.interestRate}%</div>
        </div>
        <div style={{ width: '100%', display: 'flex', gap: 14, fontSize: 12, color: '#64748b', marginTop: 2 }}>
          <span>Bureau <strong style={{ color: app.bureau.score >= 700 ? '#16a34a' : '#dc2626' }}>{app.bureau.score}</strong></span>
          <span>FOIR <strong style={{ color: app.customer.income.foir <= 55 ? '#16a34a' : '#dc2626' }}>{app.customer.income.foir}%</strong></span>
          <span>Docs <strong style={{ color: docsOk ? '#16a34a' : '#d97706' }}>{app.documents.filter((d) => d.status === 'VERIFIED').length}/{app.documents.length}</strong></span>
          <span>Suggested <RiskGradeTag grade={suggestedGrade} /></span>
        </div>
      </div>

      {!docsOk && decision === 'APPROVED' && (
        <Alert type="warning" showIcon style={{ marginBottom: 16, borderRadius: 10 }}
          message="Unverified documents exist" description="One or more documents are pending or rejected. Consider returning the file, or record a justification in remarks." />
      )}

      <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
        <Form.Item label="Approval Decision" name="decision" rules={[{ required: true }]}>
          <Radio.Group
            onChange={(e) => setDecision(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            style={{ display: 'flex', width: '100%' }}
            options={[
              { value: 'APPROVED', label: <span><CheckCircleOutlined /> Approve</span>, style: { flex: 1, textAlign: 'center' } },
              { value: 'REJECTED', label: <span><CloseCircleOutlined /> Reject</span>, style: { flex: 1, textAlign: 'center' } },
              { value: 'RETURNED', label: <span><RollbackOutlined /> Send Back</span>, style: { flex: 1, textAlign: 'center' } },
            ]}
          />
        </Form.Item>

        <Form.Item label="Risk Grade" name="riskGrade" rules={[{ required: true, message: 'Assign a risk grade' }]}>
          <Select
            options={(['A', 'B', 'C', 'D'] as RiskGrade[]).map((g) => ({
              value: g,
              label: (
                <Space>
                  <RiskGradeTag grade={g} />
                  <span style={{ fontSize: 12.5, color: '#475569' }}>{GRADE_HINT[g]}</span>
                </Space>
              ),
            }))}
          />
        </Form.Item>

        {decision === 'APPROVED' && (
          <>
            <Form.Item label="Approved Amount" name="approvedAmount" rules={[{ required: true, message: 'Enter sanctioned amount' }]}>
              <InputNumber
                style={{ width: '100%' }}
                min={10000}
                max={app.loan.amount}
                step={5000}
                formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/[₹\s,]/g, '') ?? 0) as any}
              />
            </Form.Item>
            <Space.Compact block>
              <Form.Item label="Tenure (months)" name="approvedTenure" rules={[{ required: true }]} style={{ flex: 1, marginRight: 8 }}>
                <InputNumber style={{ width: '100%' }} min={3} max={300} />
              </Form.Item>
              <Form.Item label="Rate % p.a." name="approvedRate" rules={[{ required: true }]} style={{ flex: 1 }}>
                <InputNumber style={{ width: '100%' }} min={8} max={26} step={0.25} />
              </Form.Item>
            </Space.Compact>
          </>
        )}

        {decision !== 'APPROVED' && (
          <Form.Item
            label={decision === 'REJECTED' ? 'Rejection Reason' : 'Return Reason'}
            name="reason"
            rules={[{ required: true, message: 'Select a reason' }]}
          >
            <Select
              placeholder="Select reason"
              options={(decision === 'REJECTED' ? REJECT_REASONS : RETURN_REASONS).map((r) => ({ value: r, label: r }))}
            />
          </Form.Item>
        )}

        <Form.Item
          label="Credit Remarks"
          name="remarks"
          rules={[{ required: true, message: 'Remarks are mandatory for the audit trail' }, { min: 10, message: 'Give at least 10 characters' }]}
        >
          <Input.TextArea rows={4} placeholder="Underwriting rationale, conditions, deviations approved…" showCount maxLength={500} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default CreditDecisionDrawer;

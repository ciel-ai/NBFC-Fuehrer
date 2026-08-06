import React, { useEffect, useState } from 'react';
import { App, Alert, Button, Empty, Form, Input, Modal, Select, Space, Tag } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { canDecideDeviation, openDeviations } from '../../utils/deviations';
import type { Deviation, DeviationCategory, DeviationSeverity, LoanApplication } from '../../types';

const SEVERITY_COLOR: Record<DeviationSeverity, string> = { L1: 'gold', L2: 'red' };
const STATUS_COLOR: Record<Deviation['status'], string> = {
  OPEN: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default',
};
const CATEGORIES: DeviationCategory[] = ['LTV', 'PURITY', 'KYC', 'INCOME', 'DOCUMENT', 'BUREAU', 'OTHER'];

interface Props {
  app: LoanApplication;
}

const DeviationPanel: React.FC<Props> = ({ app }) => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const ensureDeviations = useAppStore((s) => s.ensureDeviations);
  const decideDeviation = useAppStore((s) => s.decideDeviation);
  const raiseDeviation = useAppStore((s) => s.raiseDeviation);
  const withdrawDeviation = useAppStore((s) => s.withdrawDeviation);
  // Read live from the store so decisions re-render immediately.
  const deviations = useAppStore(
    (s) => s.applications.find((a) => a.id === app.id)?.deviations,
  );

  // Auto-derive on first view (mirrors backend derivation on decision-open).
  useEffect(() => {
    ensureDeviations(app.id);
  }, [app.id, ensureDeviations]);

  const [decideTarget, setDecideTarget] = useState<{ dev: Deviation; approve: boolean } | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [decideForm] = Form.useForm();
  const [raiseForm] = Form.useForm();

  const list = deviations ?? [];
  const open = openDeviations(list);

  const submitDecide = (values: { remarks: string; mitigant?: string }): void => {
    if (!decideTarget) return;
    const { dev, approve } = decideTarget;
    decideDeviation(
      app.id,
      dev.id,
      approve ? 'APPROVED' : 'REJECTED',
      values.remarks,
      { name: user.name, role: user.role },
      values.mitigant,
    );
    message.success(`Deviation ${dev.code} ${approve ? 'approved' : 'rejected'}`);
    setDecideTarget(null);
    decideForm.resetFields();
  };

  const submitRaise = (values: { category: DeviationCategory; severity: DeviationSeverity; description: string }): void => {
    raiseDeviation(app.id, values, { name: user.name, role: user.role });
    message.success('Deviation raised');
    setRaiseOpen(false);
    raiseForm.resetFields();
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="u-semibold u-md">
          <WarningOutlined className="u-warning" /> Deviations{' '}
          {open.length > 0 && <Tag color="red">{open.length} open</Tag>}
        </span>
        <Button size="small" icon={<PlusOutlined />} onClick={() => setRaiseOpen(true)}>
          Raise
        </Button>
      </div>

      {open.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 10, borderRadius: 10 }}
          message={`${open.length} open deviation${open.length > 1 ? 's' : ''} must be decided before approval`}
          description="Approval is blocked until every deviation is Approved, Rejected or Withdrawn — the same gate the server enforces (409 OPEN_DEVIATIONS)."
        />
      )}

      {list.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No deviations — within policy" />
      ) : (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {list.map((d) => {
            const mayDecide = canDecideDeviation(user.role, d.severity);
            return (
              <div
                key={d.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--ink-100)',
                  background: d.status === 'OPEN' ? 'var(--status-danger-bg, var(--ink-50))' : 'var(--ink-50)',
                }}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Tag color={SEVERITY_COLOR[d.severity]}>{d.severity}</Tag>
                  <Tag>{d.category}</Tag>
                  <span className="u-semibold u-sm">{d.code}</span>
                  <Tag color={STATUS_COLOR[d.status]} style={{ marginLeft: 'auto' }}>
                    {d.status}
                  </Tag>
                </div>
                <div className="u-sm u-ink-600" style={{ marginTop: 4 }}>
                  {d.description}
                </div>
                <div className="u-xs u-ink-400" style={{ marginTop: 2 }}>
                  Raised by {d.raisedBy === 'SYSTEM' ? 'system (auto-derived)' : d.raisedBy}
                </div>

                {d.status !== 'OPEN' && (d.decidedBy || d.decidedRemarks) && (
                  <div className="u-xs u-ink-500" style={{ marginTop: 6 }}>
                    {d.status} by {d.decidedBy}
                    {d.decidedRole ? ` (${d.decidedRole})` : ''}
                    {d.mitigant ? ` · mitigant: ${d.mitigant}` : ''}
                    {d.decidedRemarks ? ` · ${d.decidedRemarks}` : ''}
                  </div>
                )}

                {d.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {mayDecide ? (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          onClick={() => setDecideTarget({ dev: d, approve: true })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => setDecideTarget({ dev: d, approve: false })}
                        >
                          Reject
                        </Button>
                      </>
                    ) : (
                      <span className="u-xs u-ink-400">
                        <StopOutlined /> {d.severity} deviations are decided by a higher authority
                      </span>
                    )}
                    {(d.raisedBy === user.name || canDecideDeviation(user.role, d.severity)) && (
                      <Button
                        size="small"
                        type="text"
                        onClick={() =>
                          withdrawDeviation(app.id, d.id, 'Withdrawn by officer', {
                            name: user.name,
                            role: user.role,
                          })
                        }
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Space>
      )}

      {/* Decide modal */}
      <Modal
        title={`${decideTarget?.approve ? 'Approve' : 'Reject'} deviation — ${decideTarget?.dev.code ?? ''}`}
        open={!!decideTarget}
        onCancel={() => {
          setDecideTarget(null);
          decideForm.resetFields();
        }}
        onOk={() => decideForm.submit()}
        okText={decideTarget?.approve ? 'Approve' : 'Reject'}
        okButtonProps={{ danger: !decideTarget?.approve }}
        destroyOnHidden
      >
        <Form form={decideForm} layout="vertical" onFinish={submitDecide} requiredMark={false}>
          {decideTarget?.approve && (
            <Form.Item
              label="Mitigant / justification"
              name="mitigant"
              rules={[{ required: true, message: 'A mitigant is required to approve a deviation' }]}
            >
              <Input.TextArea rows={2} placeholder="Why is this exception acceptable?" maxLength={300} showCount />
            </Form.Item>
          )}
          <Form.Item
            label="Remarks"
            name="remarks"
            rules={[{ required: true, message: 'Remarks are mandatory for the audit trail' }, { min: 5 }]}
          >
            <Input.TextArea rows={3} placeholder="Decision rationale…" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* Raise modal */}
      <Modal
        title="Raise a deviation"
        open={raiseOpen}
        onCancel={() => {
          setRaiseOpen(false);
          raiseForm.resetFields();
        }}
        onOk={() => raiseForm.submit()}
        okText="Raise"
        destroyOnHidden
      >
        <Form
          form={raiseForm}
          layout="vertical"
          onFinish={submitRaise}
          requiredMark={false}
          initialValues={{ severity: 'L1', category: 'OTHER' }}
        >
          <Space.Compact block>
            <Form.Item label="Category" name="category" style={{ flex: 1, marginRight: 8 }} rules={[{ required: true }]}>
              <Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item label="Severity" name="severity" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'L1', label: 'L1 — Branch Manager+' },
                  { value: 'L2', label: 'L2 — Credit Manager/Admin' },
                ]}
              />
            </Form.Item>
          </Space.Compact>
          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Describe the deviation' }, { min: 8 }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. Applicant age 58 exceeds product ceiling of 55" maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviationPanel;

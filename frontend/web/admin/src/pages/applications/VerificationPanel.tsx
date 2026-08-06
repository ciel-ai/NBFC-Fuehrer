import React, { useState } from 'react';
import { App, Button, DatePicker, Empty, Form, Input, Modal, Radio, Select, Switch, Tag } from 'antd';
import { PhoneOutlined, EnvironmentOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { TVR_CHECKLIST, tvrStatus, cpvStatus, canWaiveVerification } from '../../utils/verification';
import type {
  CpvOutcome,
  CpvRelation,
  CpvType,
  LoanApplication,
  TvrAnswer,
  TvrCallStatus,
  TvrChecklistItem,
  TvrOutcome,
} from '../../types';

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  POSITIVE: 'success',
  NEGATIVE: 'error',
  INCONCLUSIVE: 'gold',
  WAIVED: 'purple',
};
const ANSWER_OPTS: TvrAnswer[] = ['YES', 'NO', 'UNCLEAR', 'NA'];

const SubHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  status: string;
  onRecord: () => void;
  onWaive?: () => void;
}> = ({ icon, title, status, onRecord, onWaive }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
    <span className="u-semibold u-md">
      {icon} {title}
    </span>
    <Tag color={STATUS_COLOR[status]}>{status}</Tag>
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
      {onWaive && status === 'PENDING' && (
        <Button size="small" type="text" icon={<StopOutlined />} onClick={onWaive}>
          Waive
        </Button>
      )}
      <Button size="small" icon={<PlusOutlined />} onClick={onRecord}>
        Record
      </Button>
    </div>
  </div>
);

const VerificationPanel: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const saveTvr = useAppStore((s) => s.saveTvr);
  const waiveTvr = useAppStore((s) => s.waiveTvr);
  const saveCpv = useAppStore((s) => s.saveCpv);
  const waiveCpv = useAppStore((s) => s.waiveCpv);
  const live = useAppStore((s) => s.applications.find((a) => a.id === app.id)) ?? app;

  const [tvrOpen, setTvrOpen] = useState(false);
  const [cpvOpen, setCpvOpen] = useState(false);
  const [waive, setWaive] = useState<null | 'TVR' | 'CPV'>(null);
  const [tvrForm] = Form.useForm();
  const [cpvForm] = Form.useForm();
  const [waiveForm] = Form.useForm();

  const canWaive = canWaiveVerification(user.role);
  const tStatus = tvrStatus(live);
  const cStatus = cpvStatus(live);

  const submitTvr = (v: {
    phoneCalled: string;
    status: TvrCallStatus;
    outcome: TvrOutcome;
    remarks: string;
    [k: string]: unknown;
  }): void => {
    const checklist: TvrChecklistItem[] = TVR_CHECKLIST.map((q) => ({
      ...q,
      answer: (v[`ans_${q.key}`] as TvrAnswer) ?? 'UNCLEAR',
    }));
    saveTvr(
      app.id,
      { phoneCalled: v.phoneCalled, checklist, outcome: v.outcome, remarks: v.remarks, status: v.status },
      { name: user.name, role: user.role },
    );
    message.success('TVR recorded');
    setTvrOpen(false);
    tvrForm.resetFields();
  };

  const submitCpv = (v: {
    type: CpvType;
    assignedTo: string;
    visitDate: dayjs.Dayjs;
    addressVerified: boolean;
    personMet: string;
    relation: CpvRelation;
    outcome: CpvOutcome;
    remarks: string;
  }): void => {
    saveCpv(
      app.id,
      {
        type: v.type,
        assignedTo: v.assignedTo,
        visitDate: v.visitDate.format('YYYY-MM-DD'),
        addressVerified: !!v.addressVerified,
        personMet: v.personMet,
        relation: v.relation,
        outcome: v.outcome,
        remarks: v.remarks,
      },
      { name: user.name, role: user.role },
    );
    message.success('CPV recorded');
    setCpvOpen(false);
    cpvForm.resetFields();
  };

  const submitWaive = (v: { remarks: string }): void => {
    if (waive === 'TVR') waiveTvr(app.id, v.remarks, { name: user.name, role: user.role });
    else if (waive === 'CPV') waiveCpv(app.id, v.remarks, { name: user.name, role: user.role });
    message.warning(`${waive} waived — an L1 deviation was raised for the credit decision.`);
    setWaive(null);
    waiveForm.resetFields();
  };

  return (
    <div style={{ marginBottom: 18 }}>
      {/* ── TVR ── */}
      <SubHeader
        icon={<PhoneOutlined className="u-accent" />}
        title="Tele-Verification (TVR)"
        status={tStatus}
        onRecord={() => setTvrOpen(true)}
        onWaive={canWaive ? () => setWaive('TVR') : undefined}
      />
      {live.tvrWaiver ? (
        <div className="u-sm u-ink-500" style={{ marginBottom: 12 }}>
          Waived by {live.tvrWaiver.by} ({live.tvrWaiver.role}) · {live.tvrWaiver.remarks}
        </div>
      ) : !live.tvr?.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No call attempts yet" style={{ marginBottom: 12 }} />
      ) : (
        <div style={{ marginBottom: 12 }}>
          {live.tvr.map((r) => (
            <div key={r.id} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--ink-100)', background: 'var(--ink-50)', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="u-semibold u-sm">Attempt {r.attemptNo}</span>
                <Tag color={STATUS_COLOR[r.outcome]}>{r.outcome}</Tag>
                <Tag>{r.status}</Tag>
                <span className="u-xs u-ink-400" style={{ marginLeft: 'auto' }}>{r.phoneCalled} · {r.calledBy}</span>
              </div>
              <div className="u-xs u-ink-500" style={{ marginTop: 4 }}>
                {r.checklist.map((c) => `${c.label}: ${c.answer}`).join(' · ')}
              </div>
              {r.remarks && <div className="u-xs u-ink-500" style={{ marginTop: 2 }}>{r.remarks}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── CPV ── */}
      <SubHeader
        icon={<EnvironmentOutlined className="u-accent" />}
        title="Contact-Point Verification (CPV)"
        status={cStatus}
        onRecord={() => setCpvOpen(true)}
        onWaive={canWaive ? () => setWaive('CPV') : undefined}
      />
      {live.cpvWaiver ? (
        <div className="u-sm u-ink-500">
          Waived by {live.cpvWaiver.by} ({live.cpvWaiver.role}) · {live.cpvWaiver.remarks}
        </div>
      ) : !live.cpv?.length ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No field visits yet" />
      ) : (
        <div>
          {live.cpv.map((r) => (
            <div key={r.id} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--ink-100)', background: 'var(--ink-50)', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Tag>{r.type}</Tag>
                <Tag color={STATUS_COLOR[r.outcome === 'POSITIVE' ? 'POSITIVE' : r.outcome === 'NEGATIVE' ? 'NEGATIVE' : 'INCONCLUSIVE']}>{r.outcome}</Tag>
                <span className="u-xs u-ink-400" style={{ marginLeft: 'auto' }}>{r.visitDate} · {r.assignedTo}</span>
              </div>
              <div className="u-xs u-ink-500" style={{ marginTop: 4 }}>
                Address {r.addressVerified ? 'verified' : 'not verified'} · met {r.personMet} ({r.relation})
              </div>
              {r.remarks && <div className="u-xs u-ink-500" style={{ marginTop: 2 }}>{r.remarks}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── TVR modal ── */}
      <Modal
        title="Record tele-verification"
        open={tvrOpen}
        onCancel={() => { setTvrOpen(false); tvrForm.resetFields(); }}
        onOk={() => tvrForm.submit()}
        okText="Record"
        destroyOnHidden
      >
        <Form form={tvrForm} layout="vertical" onFinish={submitTvr} requiredMark={false}
          initialValues={{ phoneCalled: app.customer.mobile, status: 'COMPLETED', outcome: 'POSITIVE' }}>
          <Form.Item label="Phone called" name="phoneCalled" rules={[{ required: true }]}>
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item label="Call status" name="status" rules={[{ required: true }]}>
            <Select options={(['COMPLETED', 'NO_ANSWER', 'WRONG_NUMBER'] as TvrCallStatus[]).map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          <div className="t-label" style={{ marginBottom: 6 }}>Checklist</div>
          {TVR_CHECKLIST.map((q) => (
            <Form.Item key={q.key} label={q.label} name={`ans_${q.key}`} initialValue="YES" style={{ marginBottom: 10 }}>
              <Radio.Group optionType="button" buttonStyle="solid" size="small"
                options={ANSWER_OPTS.map((a) => ({ value: a, label: a }))} />
            </Form.Item>
          ))}
          <Form.Item label="Outcome" name="outcome" rules={[{ required: true }]}>
            <Select options={(['POSITIVE', 'NEGATIVE', 'INCONCLUSIVE'] as TvrOutcome[]).map((o) => ({ value: o, label: o }))} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks" rules={[{ required: true, message: 'Remarks are mandatory' }, { min: 5 }]}>
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── CPV modal ── */}
      <Modal
        title="Record contact-point verification"
        open={cpvOpen}
        onCancel={() => { setCpvOpen(false); cpvForm.resetFields(); }}
        onOk={() => cpvForm.submit()}
        okText="Record"
        destroyOnHidden
      >
        <Form form={cpvForm} layout="vertical" onFinish={submitCpv} requiredMark={false}
          initialValues={{ type: 'RESIDENCE', relation: 'SELF', outcome: 'POSITIVE', addressVerified: true, visitDate: dayjs() }}>
          <Form.Item label="Visit type" name="type" rules={[{ required: true }]}>
            <Select options={(['RESIDENCE', 'OFFICE'] as CpvType[]).map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item label="Verified by (officer / agency)" name="assignedTo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Visit date" name="visitDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
          </Form.Item>
          <Form.Item label="Address verified" name="addressVerified" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Person met" name="personMet" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Relation" name="relation" rules={[{ required: true }]}>
            <Select options={(['SELF', 'FAMILY', 'NEIGHBOUR', 'OTHER'] as CpvRelation[]).map((r) => ({ value: r, label: r }))} />
          </Form.Item>
          <Form.Item label="Outcome" name="outcome" rules={[{ required: true }]}>
            <Select options={(['POSITIVE', 'NEGATIVE', 'DOOR_LOCKED', 'ADDRESS_NOT_FOUND'] as CpvOutcome[]).map((o) => ({ value: o, label: o }))} />
          </Form.Item>
          <Form.Item label="Remarks" name="remarks" rules={[{ required: true, message: 'Remarks are mandatory' }, { min: 5 }]}>
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Waive modal ── */}
      <Modal
        title={`Waive ${waive ?? ''} verification`}
        open={!!waive}
        onCancel={() => { setWaive(null); waiveForm.resetFields(); }}
        onOk={() => waiveForm.submit()}
        okText="Waive"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <p className="u-sm u-ink-500">Waiving auto-raises an L1 deviation, so the credit decision must still address the skipped check.</p>
        <Form form={waiveForm} layout="vertical" onFinish={submitWaive} requiredMark={false}>
          <Form.Item label="Justification" name="remarks" rules={[{ required: true, message: 'A justification is required to waive' }, { min: 8 }]}>
            <Input.TextArea rows={3} maxLength={300} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VerificationPanel;

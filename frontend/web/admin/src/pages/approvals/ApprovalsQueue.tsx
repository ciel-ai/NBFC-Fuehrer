// pages/approvals/ApprovalsQueue.tsx
//
// Maker-checker queue (RBI four-eyes). Checkers see pending requests and
// approve (executes the underlying action) or reject with mandatory
// remarks. Self-raised requests are visibly disabled — the backend
// enforces the same rule, this is just honest UI.
//
// Live-only by design: like Roles & Permissions, this is a compliance
// surface — an unreachable API shows an explicit error, never sample data.

import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Input, Modal, Segmented, Table, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { ErrorState, PageLoader } from '../../components/StateViews';
import { StatusTag } from '../../components/StatusTag';
import { approvalsApi } from '../../api/approvals.api';
import type { ApprovalRequest } from '../../api/approvals.api';
import { useAuthStore } from '../../store/authStore';
import { fmtTimeAgo, inr } from '../../utils/format';

const ACTION_LABEL: Record<string, string> = {
  LOAN_APPROVAL: 'Loan Sanction',
};

const ApprovalsQueue: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const [tab, setTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [rows, setRows] = useState<ApprovalRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<{ row: ApprovalRequest; kind: 'approve' | 'reject' } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setRows(await approvalsApi.list());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => (
    (rows ?? []).filter((r) => tab === 'PENDING' ? r.status === 'PENDING' : r.status !== 'PENDING')
  ), [rows, tab]);

  const pendingCount = useMemo(() => (rows ?? []).filter((r) => r.status === 'PENDING').length, [rows]);

  const decide = async (): Promise<void> => {
    if (!deciding) return;
    if (deciding.kind === 'reject' && remarks.trim().length < 5) {
      message.error('Rejection remarks are mandatory (min 5 characters).');
      return;
    }
    setBusy(true);
    try {
      if (deciding.kind === 'approve') {
        await approvalsApi.approve(deciding.row.id, remarks.trim() || undefined);
        message.success(`${deciding.row.entity_ref ?? 'Request'} approved — action executed.`);
      } else {
        await approvalsApi.reject(deciding.row.id, remarks.trim());
        message.success(`${deciding.row.entity_ref ?? 'Request'} rejected.`);
      }
      setDeciding(null);
      setRemarks('');
      await load();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message ?? 'Decision failed — nothing was changed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && rows === null) return <PageLoader />;
  if (error && rows === null) {
    return (
      <div>
        <PageHeader title="Approvals" subtitle="Maker-checker queue" />
        <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }}>
          <ErrorState
            title="Could not load the approvals queue"
            detail="The approvals API did not respond. This compliance surface has no sample fallback by design."
            onRetry={() => { void load(); }}
          />
        </Card>
      </div>
    );
  }

  const columns: TableProps<ApprovalRequest>['columns'] = [
    {
      title: 'Request',
      dataIndex: 'entity_ref',
      width: 170,
      render: (v: string | null, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v ?? r.id.slice(0, 8).toUpperCase()}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{ACTION_LABEL[r.action_type] ?? r.action_type}</div>
        </div>
      ),
    },
    {
      title: 'Amount', dataIndex: 'amount', align: 'right', width: 130,
      render: (v: number | null) => v === null ? '—' : <span className="tnum" style={{ fontWeight: 700 }}>{inr(v)}</span>,
    },
    {
      title: 'Maker', dataIndex: 'maker_role', width: 160,
      render: (v: string, r) => (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{v}</div>
          {r.maker_remarks && <div style={{ fontSize: 11, color: '#9ca3af', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>“{r.maker_remarks}”</div>}
        </div>
      ),
    },
    { title: 'Raised', dataIndex: 'created_at', width: 110, render: (v: string) => <span style={{ fontSize: 12, color: '#6b7280' }}>{fmtTimeAgo(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <StatusTag status={s} /> },
    ...(tab === 'HISTORY' ? [{
      title: 'Checker', dataIndex: 'checker_role', width: 170,
      render: (v: string | null, r: ApprovalRequest) => v
        ? <div><div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>{v}</div>{r.checker_remarks && <div style={{ fontSize: 11, color: '#9ca3af' }}>“{r.checker_remarks}”</div>}</div>
        : '—',
    }] : []),
    ...(tab === 'PENDING' ? [{
      title: 'Decision',
      key: 'actions',
      width: 190,
      render: (_: unknown, r: ApprovalRequest) => {
        const isOwn = r.maker_id === user.id;
        return (
          <Tooltip title={isOwn ? 'Segregation of duties — you raised this request; a different user must decide it.' : ''}>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <Button size="small" type="primary" icon={<CheckOutlined />} disabled={isOwn}
                onClick={() => { setDeciding({ row: r, kind: 'approve' }); setRemarks(''); }}>
                Approve
              </Button>
              <Button size="small" danger icon={<CloseOutlined />} disabled={isOwn}
                onClick={() => { setDeciding({ row: r, kind: 'reject' }); setRemarks(''); }}>
                Reject
              </Button>
            </span>
          </Tooltip>
        );
      },
    }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={`Maker-checker (four-eyes) queue · ${pendingCount} pending · decisions are audited`}
        extra={
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as 'PENDING' | 'HISTORY')}
            options={[
              { label: `Pending (${pendingCount})`, value: 'PENDING' },
              { label: 'History', value: 'HISTORY' },
            ]}
          />
        }
      />
      <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }} styles={{ body: { padding: 0 } }}>
        <Table<ApprovalRequest>
          dataSource={visible}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 900 }}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} requests` }}
        />
      </Card>

      <Modal
        title={deciding?.kind === 'approve'
          ? `Approve ${deciding.row.entity_ref ?? 'request'} — executes the sanction`
          : `Reject ${deciding?.row.entity_ref ?? 'request'}`}
        open={deciding !== null}
        okText={deciding?.kind === 'approve' ? 'Approve & Execute' : 'Reject'}
        okButtonProps={{ danger: deciding?.kind === 'reject', loading: busy }}
        onCancel={() => { setDeciding(null); setRemarks(''); }}
        onOk={() => { void decide(); }}
      >
        {deciding?.row.amount != null && (
          <div style={{ marginBottom: 12, fontSize: 13, color: '#374151' }}>
            Sanction amount: <strong className="tnum">{inr(deciding.row.amount)}</strong>
            {deciding.row.maker_remarks && <> · Maker: “{deciding.row.maker_remarks}”</>}
          </div>
        )}
        <div style={{ marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: '#4b5563' }}>
          Remarks {deciding?.kind === 'reject' ? '(mandatory)' : '(optional)'}
        </div>
        <Input.TextArea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={deciding?.kind === 'reject' ? 'Why is this being rejected?' : 'Checker notes for the audit trail…'}
          maxLength={500}
        />
      </Modal>
    </div>
  );
};

export default ApprovalsQueue;

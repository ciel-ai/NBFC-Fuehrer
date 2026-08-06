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
import { App, Button, Card, Input, Modal, Segmented, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { ErrorState, PageLoader } from '../../components/StateViews';
import { StatusTag } from '../../components/StatusTag';
import { approvalsApi } from '../../api/approvals.api';
import type { ApprovalRequest } from '../../api/approvals.api';
import { useAuthStore } from '../../store/authStore';
import { fmtTimeAgo, inr } from '../../utils/format';
import DataTable from '../../components/DataTable';

const ACTION_LABEL: Record<string, string> = {
  LOAN_APPROVAL: 'Loan Sanction',
  LOAN_SANCTION_BM: 'BM Sanction',
  DEVIATION_APPROVAL: 'Deviation Approval',
};

const isBmSanction = (r: ApprovalRequest): boolean =>
  r.action_type === 'LOAN_SANCTION_BM' || r.required_role === 'BRANCH_MANAGER';

const ApprovalsQueue: React.FC = () => {
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const [tab, setTab] = useState<'PENDING' | 'BM_SANCTION' | 'HISTORY'>('PENDING');
  const [rows, setRows] = useState<ApprovalRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<{
    row: ApprovalRequest;
    kind: 'approve' | 'reject';
  } | null>(null);
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

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (tab === 'HISTORY') return r.status !== 'PENDING';
        if (tab === 'BM_SANCTION') return r.status === 'PENDING' && isBmSanction(r);
        // PENDING tab: everything awaiting a decision except BM sanctions, which
        // have their own branch-manager queue.
        return r.status === 'PENDING' && !isBmSanction(r);
      }),
    [rows, tab],
  );

  const pendingCount = useMemo(
    () => (rows ?? []).filter((r) => r.status === 'PENDING' && !isBmSanction(r)).length,
    [rows],
  );

  const bmCount = useMemo(
    () => (rows ?? []).filter((r) => r.status === 'PENDING' && isBmSanction(r)).length,
    [rows],
  );

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
        <Card>
          <ErrorState
            title="Could not load the approvals queue"
            detail="The approvals API did not respond. This compliance surface has no sample fallback by design."
            onRetry={() => {
              void load();
            }}
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
          <div className="u-semibold u-accent u-sm">{v ?? r.id.slice(0, 8).toUpperCase()}</div>
          <div className="u-xs u-ink-400">{ACTION_LABEL[r.action_type] ?? r.action_type}</div>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      width: 130,
      render: (v: number | null) =>
        v === null ? '—' : <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'Maker',
      dataIndex: 'maker_role',
      width: 160,
      render: (v: string, r) => (
        <div>
          <div className="u-sm u-semibold u-ink-700">{v}</div>
          {r.maker_remarks && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--ink-400)',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              “{r.maker_remarks}”
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Raised',
      dataIndex: 'created_at',
      width: 110,
      render: (v: string) => <span className="u-sm u-ink-500">{fmtTimeAgo(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <StatusTag status={s} />,
    },
    ...(tab === 'HISTORY'
      ? [
          {
            title: 'Checker',
            dataIndex: 'checker_role',
            width: 170,
            render: (v: string | null, r: ApprovalRequest) =>
              v ? (
                <div>
                  <div className="u-sm u-semibold u-ink-700">{v}</div>
                  {r.checker_remarks && <div className="u-xs u-ink-400">“{r.checker_remarks}”</div>}
                </div>
              ) : (
                '—'
              ),
          },
        ]
      : []),
    ...(tab === 'PENDING'
      ? [
          {
            title: 'Decision',
            key: 'actions',
            width: 190,
            render: (_: unknown, r: ApprovalRequest) => {
              const isOwn = r.maker_id === user.id;
              return (
                <Tooltip
                  title={
                    isOwn
                      ? 'Segregation of duties — you raised this request; a different user must decide it.'
                      : ''
                  }
                >
                  <span style={{ display: 'inline-flex', gap: 8 }}>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      disabled={isOwn}
                      onClick={() => {
                        setDeciding({ row: r, kind: 'approve' });
                        setRemarks('');
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      disabled={isOwn}
                      onClick={() => {
                        setDeciding({ row: r, kind: 'reject' });
                        setRemarks('');
                      }}
                    >
                      Reject
                    </Button>
                  </span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle={`Maker-checker (four-eyes) queue · ${pendingCount} pending · decisions are audited`}
        extra={
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as 'PENDING' | 'BM_SANCTION' | 'HISTORY')}
            options={[
              { label: `Pending (${pendingCount})`, value: 'PENDING' },
              { label: `BM Sanctions (${bmCount})`, value: 'BM_SANCTION' },
              { label: 'History', value: 'HISTORY' },
            ]}
          />
        }
      />
      <Card styles={{ body: { padding: 0 } }}>
        <DataTable<ApprovalRequest>
          dataSource={visible}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} requests` }}
        />
      </Card>

      <Modal
        title={
          deciding?.kind === 'approve'
            ? `Approve ${deciding.row.entity_ref ?? 'request'} — executes the sanction`
            : `Reject ${deciding?.row.entity_ref ?? 'request'}`
        }
        open={deciding !== null}
        okText={deciding?.kind === 'approve' ? 'Approve & Execute' : 'Reject'}
        okButtonProps={{ danger: deciding?.kind === 'reject', loading: busy }}
        onCancel={() => {
          setDeciding(null);
          setRemarks('');
        }}
        onOk={() => {
          void decide();
        }}
      >
        {deciding?.row.amount != null && (
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--ink-700)' }}>
            Sanction amount: <strong className="tnum">{inr(deciding.row.amount)}</strong>
            {deciding.row.maker_remarks && <> · Maker: “{deciding.row.maker_remarks}”</>}
          </div>
        )}
        <div style={{ marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-600)' }}>
          Remarks {deciding?.kind === 'reject' ? '(mandatory)' : '(optional)'}
        </div>
        <Input.TextArea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={
            deciding?.kind === 'reject'
              ? 'Why is this being rejected?'
              : 'Checker notes for the audit trail…'
          }
          maxLength={500}
        />
      </Modal>
    </div>
  );
};

export default ApprovalsQueue;

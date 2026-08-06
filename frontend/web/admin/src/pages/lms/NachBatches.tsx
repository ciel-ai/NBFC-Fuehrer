import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Segmented, Select, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import { useNachBatchItems, useNachBatches } from '../../hooks/useNach';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';
import { EmptyState, NoResults } from '../../components/StateViews';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import type { NachBatch, NachDebitItem, NachItemStatus } from '../../types';

/* ============================================================================
 * Recurring debits — what the e-NACH cron actually did.
 *
 * Before this screen existed, a failed auto-debit was invisible to staff: the
 * EMI simply stayed unpaid and surfaced days later as DPD, with no way to tell
 * "the customer has no money" from "the mandate is dead" from "the file has not
 * come back from the sponsor bank yet". Those three need completely different
 * responses, so the table keeps them as three distinct statuses and never
 * rounds a pending presentation up to a failure.
 * ==========================================================================*/

const STAT_TONES = {
  success: 'var(--status-success-fg)',
  danger: 'var(--status-danger-fg)',
  warning: 'var(--status-warning-fg)',
  ink: 'var(--ink-900)',
} as const;

const Stat: React.FC<{
  label: string;
  count: number;
  amount: number;
  tone?: keyof typeof STAT_TONES;
}> = ({ label, count, amount, tone = 'ink' }) => (
  <div style={{ minWidth: 120 }}>
    <div className="t-label">{label}</div>
    <div className="tnum" style={{ fontSize: 21, fontWeight: 700, color: STAT_TONES[tone] }}>
      {count}
    </div>
    <div className="u-xs u-ink-400 tnum">{inr(amount)}</div>
  </div>
);

const batchLabel = (b: NachBatch): string =>
  `${fmtDate(b.presentationDate)} · ${b.cycle === 'RETRY' ? 'Retry cycle' : 'Presentation'} · ${b.totalCount} debits`;

const NachBatches: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const scope = scopedLoanType(user.role);

  const batchFeed = useNachBatches();
  const batches = batchFeed.data;

  const [batchId, setBatchId] = useState<string>();
  /* Default to the newest run rather than forcing a pick — "what happened
     today" is the question this page exists to answer. */
  const activeBatchId = batchId && batches.some((b) => b.id === batchId) ? batchId : batches[0]?.id;
  const batch = batches.find((b) => b.id === activeBatchId);

  const itemFeed = useNachBatchItems(activeBatchId);

  const [statusFilter, setStatusFilter] = useState<NachItemStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  /* A loan-type-scoped role sees only its own product's debits, exactly as it
     does everywhere else in the portal. */
  const scoped = useMemo(
    () => itemFeed.data.filter((i) => !scope || i.loanType === scope),
    [itemFeed.data, scope],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((i) => {
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (q && !`${i.loanNumber} ${i.customerName} ${i.umrn ?? ''} ${i.bankName}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [scoped, statusFilter, search]);

  /* Totals come from the ITEMS the role can see, not the batch header, or a
     product-scoped user would read head-office numbers against their own list. */
  const tally = useMemo(() => {
    const acc = {
      total: { count: 0, amount: 0 },
      SUCCESS: { count: 0, amount: 0 },
      FAILED: { count: 0, amount: 0 },
      RETRYING: { count: 0, amount: 0 },
      PENDING: { count: 0, amount: 0 },
    };
    for (const i of scoped) {
      acc.total.count++;
      acc.total.amount += i.amount;
      acc[i.status].count++;
      acc[i.status].amount += i.amount;
    }
    return acc;
  }, [scoped]);

  const source = batchFeed.source === 'live' && itemFeed.source === 'live' ? 'live' : batchFeed.source;
  const error = batchFeed.error ?? itemFeed.error;
  const reload = (): void => {
    batchFeed.reload();
    itemFeed.reload();
  };

  const cols: TableProps<NachDebitItem>['columns'] = [
    {
      title: 'Loan Number',
      dataIndex: 'loanNumber',
      width: 180,
      render: (v: string) => <span className="u-semibold u-accent u-sm">{v}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      width: 170,
      render: (v: string) => <span className="u-semibold">{v}</span>,
    },
    { title: 'Type', dataIndex: 'loanType', width: 88, render: (t) => <LoanTypeTag type={t} /> },
    {
      title: 'UMRN',
      dataIndex: 'umrn',
      width: 165,
      render: (v?: string) =>
        v ? (
          <span className="tnum u-sm u-ink-500">{v}</span>
        ) : (
          <span className="u-ink-200">—</span>
        ),
    },
    {
      title: 'Bank',
      dataIndex: 'bankName',
      width: 150,
      render: (v: string) => <span className="u-sm u-ink-600">{v}</span>,
    },
    {
      title: 'EMI #',
      dataIndex: 'emiSeq',
      width: 70,
      align: 'center',
      render: (v?: number) => v ?? '—',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      width: 120,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Attempt',
      dataIndex: 'attempt',
      width: 82,
      align: 'center',
      render: (v: number) => (
        <span className="tnum" style={{ fontWeight: v > 1 ? 700 : 400 }}>
          {v > 1 ? `#${v}` : '1'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <StatusTag status={s} />,
      sorter: (a, b) => a.status.localeCompare(b.status),
    },
    {
      title: 'Outcome',
      key: 'outcome',
      width: 260,
      render: (_, r) => {
        if (r.status === 'SUCCESS') {
          return <span className="tnum u-xs u-ink-500">UTR {r.utr ?? '—'}</span>;
        }
        if (r.status === 'PENDING') {
          return <span className="u-xs u-ink-400">Awaiting response from sponsor bank</span>;
        }
        return (
          <div>
            <div className="u-sm" style={{ color: 'var(--status-danger-fg)' }}>
              {r.returnReason ?? 'Returned'}
              {r.returnCode && <span className="u-ink-400"> ({r.returnCode})</span>}
            </div>
            {r.nextRetryOn && (
              <div className="u-xs u-ink-400">Re-presenting on {fmtDate(r.nextRetryOn)}</div>
            )}
          </div>
        );
      },
    },
  ];

  const handleExport = (): void => {
    exportCsv(
      `nach-${batch?.id ?? 'batch'}`,
      [
        'Loan',
        'Customer',
        'Type',
        'UMRN',
        'Bank',
        'EMI #',
        'Amount',
        'Attempt',
        'Status',
        'Return Code',
        'Return Reason',
        'UTR',
        'Next Retry',
      ],
      rows.map((r) => [
        r.loanNumber,
        r.customerName,
        r.loanType,
        r.umrn ?? '',
        r.bankName,
        r.emiSeq ?? '',
        r.amount,
        r.attempt,
        r.status,
        r.returnCode ?? '',
        r.returnReason ?? '',
        r.utr ?? '',
        r.nextRetryOn ?? '',
      ]),
    );
  };

  const isFiltering = search.trim().length > 0 || statusFilter !== 'ALL';
  const clearFilters = (): void => {
    setSearch('');
    setStatusFilter('ALL');
  };

  return (
    <div>
      <PageHeader
        title="Recurring Debits"
        subtitle={
          batch
            ? `${batch.cycle === 'RETRY' ? 'Retry cycle' : 'Presentation'} of ${fmtDate(batch.presentationDate)} · file ${batch.fileRef} · ${batch.sponsorBank}`
            : 'e-NACH auto-debit batches'
        }
        extra={
          <>
            <Button icon={<ReloadOutlined />} onClick={reload}>
              Refresh
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!rows.length}>
              Export CSV
            </Button>
          </>
        }
      />

      <DataSourceNotice source={source} error={error} onRetry={reload} />

      {!batch ? (
        <Card>
          <EmptyState
            title="No debit batches yet"
            detail="Nothing has been presented for auto-debit in this window."
          />
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 22px' } }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} xl={9}>
                <div className="t-label" style={{ marginBottom: 6 }}>
                  Batch run
                </div>
                <Select
                  aria-label="Batch run"
                  style={{ width: '100%', maxWidth: 380 }}
                  value={activeBatchId}
                  onChange={setBatchId}
                  options={batches.map((b) => ({ value: b.id, label: batchLabel(b) }))}
                />
                <div className="u-xs u-ink-400" style={{ marginTop: 6 }}>
                  <StatusTag status={batch.status} /> started {fmtDateTime(batch.startedAt)}
                  {batch.completedAt
                    ? ` · finished ${dayjs(batch.completedAt).format('HH:mm')}`
                    : ' · still running'}
                </div>
              </Col>
              <Col xs={24} xl={15}>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  <Stat label="Presented" count={tally.total.count} amount={tally.total.amount} />
                  <Stat
                    label="Succeeded"
                    count={tally.SUCCESS.count}
                    amount={tally.SUCCESS.amount}
                    tone="success"
                  />
                  <Stat
                    label="Retrying"
                    count={tally.RETRYING.count}
                    amount={tally.RETRYING.amount}
                    tone="warning"
                  />
                  <Stat
                    label="Failed"
                    count={tally.FAILED.count}
                    amount={tally.FAILED.amount}
                    tone="danger"
                  />
                  <Tooltip title="Presented, but the sponsor bank has not returned a result yet">
                    <span>
                      <Stat
                        label="Awaiting"
                        count={tally.PENDING.count}
                        amount={tally.PENDING.amount}
                      />
                    </span>
                  </Tooltip>
                </div>
              </Col>
            </Row>
          </Card>

          <Card styles={{ body: { padding: 0 } }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                padding: '16px 18px',
                flexWrap: 'wrap',
                borderBottom: '1px solid var(--ink-100)',
              }}
            >
              <Segmented
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as NachItemStatus | 'ALL')}
                options={[
                  { value: 'ALL', label: `All (${tally.total.count})` },
                  { value: 'SUCCESS', label: `Succeeded (${tally.SUCCESS.count})` },
                  { value: 'RETRYING', label: `Retrying (${tally.RETRYING.count})` },
                  { value: 'FAILED', label: `Failed (${tally.FAILED.count})` },
                  { value: 'PENDING', label: `Awaiting (${tally.PENDING.count})` },
                ]}
              />
              <Input
                prefix={<SearchOutlined className="u-ink-400" />}
                placeholder="Search loan, customer, UMRN, bank…"
                allowClear
                style={{ width: 300 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DataTable<NachDebitItem>
              loading={itemFeed.loading}
              dataSource={rows}
              columns={cols}
              rowKey="id"
              className="row-link"
              flagRow={(r) =>
                r.status === 'FAILED' ? 'danger' : r.status === 'RETRYING' ? 'warning' : false
              }
              locale={
                isFiltering && scoped.length > 0
                  ? {
                      emptyText: (
                        <NoResults query={search.trim() || undefined} onClear={clearFilters} />
                      ),
                    }
                  : undefined
              }
              onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} debits`,
              }}
              scroll={{ x: 1400 }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default NachBatches;

import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Segmented } from 'antd';
import type { TableProps } from 'antd';
import {
  DownloadOutlined,
  RightCircleOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useApplications } from '../../hooks/useApplications';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { MetricBand } from '../../components/KpiCard';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr, inrCompact, maskAccount } from '../../utils/format';
import type { LoanApplication } from '../../types';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';

type FinanceTab = 'pending' | 'emandates' | 'disbursed';

const FinanceQueue: React.FC = () => {
  const navigate = useNavigate();
  const { tab = 'pending' } = useParams<{ tab: FinanceTab }>();
  const activeTab = (
    ['pending', 'emandates', 'disbursed'].includes(tab) ? tab : 'pending'
  ) as FinanceTab;
  const user = useAuthStore((s) => s.user)!;
  const { applications, loading, source, error, reload } = useApplications();
  const scope = scopedLoanType(user.role);
  const [search, setSearch] = useState('');

  const scoped = useMemo(
    () => applications.filter((a) => !scope || a.loanType === scope),
    [applications, scope],
  );

  const buckets = useMemo(
    () => ({
      pending: scoped.filter((a) => ['CREDIT_APPROVED', 'FINANCE_PENDING'].includes(a.status)),
      emandates: scoped.filter((a) => a.status === 'EMANDATE_PENDING'),
      disbursed: scoped.filter(
        (a) => ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(a.status) && a.finance?.disbursement,
      ),
    }),
    [scoped],
  );

  const disbursedToday = buckets.disbursed.filter((a) =>
    dayjs(a.finance!.disbursement!.date).isSame(dayjs(), 'day'),
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buckets[activeTab].filter(
      (a) =>
        !q || `${a.appNumber} ${a.customer.name} ${a.customer.mobile}`.toLowerCase().includes(q),
    );
  }, [buckets, activeTab, search]);

  const baseCols: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application',
      dataIndex: 'appNumber',
      render: (v: string, r) => (
        <div>
          <div className="u-semibold u-accent u-sm">{v}</div>
          <div style={{ fontWeight: 600, color: 'var(--ink-900)', marginTop: 2 }}>
            {r.customer.name}
          </div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'loanType', width: 95, render: (t) => <LoanTypeTag type={t} /> },
    {
      title: 'Sanctioned',
      key: 'sanctioned',
      align: 'right',
      width: 140,
      sorter: (a, b) =>
        (a.creditDecision?.approvedAmount ?? a.loan.amount) -
        (b.creditDecision?.approvedAmount ?? b.loan.amount),
      render: (_, r) => (
        <span className="tnum u-semibold">
          {inr(r.creditDecision?.approvedAmount ?? r.loan.amount)}
        </span>
      ),
    },
  ];

  const pendingCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'Net Payout',
      key: 'net',
      align: 'right',
      width: 140,
      render: (_, r) =>
        r.finance ? (
          <span className="tnum u-semibold u-success">{inr(r.finance.netDisbursement)}</span>
        ) : (
          <span className="u-ink-400 u-sm">on verification</span>
        ),
    },
    {
      title: 'Beneficiary Bank',
      key: 'bank',
      width: 210,
      render: (_, r) =>
        r.finance ? (
          <span className="u-sm u-ink-600">
            {r.finance.bank.bankName} ·{' '}
            <span className="tnum">{maskAccount(r.finance.bank.accountNumber)}</span>
          </span>
        ) : (
          <span className="u-ink-400 u-sm">pending verification</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      render: (_, r) => (
        <Button
          size="small"
          type="primary"
          icon={<RightCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/applications/view/${r.id}`);
          }}
        >
          Process
        </Button>
      ),
    },
  ];

  const emandateCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'Mandate Bank',
      key: 'bank',
      width: 180,
      render: (_, r) => (
        <span className="u-sm u-ink-600">
          {r.finance?.emandate.bank ?? r.finance?.bank.bankName}
        </span>
      ),
    },
    {
      title: 'Debit Cap',
      key: 'cap',
      align: 'right',
      width: 110,
      render: (_, r) => (
        <span className="tnum">
          {r.finance?.emandate.maxAmount ? inr(r.finance.emandate.maxAmount) : '—'}
        </span>
      ),
    },
    {
      title: 'UMRN',
      key: 'umrn',
      width: 190,
      render: (_, r) => (
        <span className="tnum u-sm">
          {r.finance?.emandate.umrn ?? <span className="u-ink-400">awaiting NPCI</span>}
        </span>
      ),
    },
    {
      title: 'NACH Status',
      key: 'nach',
      width: 120,
      render: (_, r) => <StatusTag status={r.finance?.emandate.status ?? 'NOT_SETUP'} />,
    },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      render: (_, r) => (
        <Button
          size="small"
          type="primary"
          icon={<RightCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/applications/view/${r.id}`);
          }}
        >
          {r.finance?.emandate.status === 'ACTIVE' ? 'Disburse' : 'Track'}
        </Button>
      ),
    },
  ];

  const disbursedCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'Net Disbursed',
      key: 'net',
      align: 'right',
      width: 140,
      render: (_, r) => (
        <span className="tnum u-semibold u-success">{inr(r.finance!.disbursement!.amount)}</span>
      ),
    },
    {
      title: 'Mode / UTR',
      key: 'utr',
      width: 230,
      render: (_, r) => (
        <span className="u-sm u-ink-600">
          {r.finance!.disbursement!.mode} ·{' '}
          <span className="tnum">{r.finance!.disbursement!.utr}</span>
        </span>
      ),
    },
    {
      title: 'Disbursed On',
      key: 'date',
      width: 175,
      sorter: (a, b) =>
        dayjs(a.finance!.disbursement!.date).valueOf() -
        dayjs(b.finance!.disbursement!.date).valueOf(),
      defaultSortOrder: 'descend',
      render: (_, r) => (
        <span className="u-sm u-ink-600">{fmtDateTime(r.finance!.disbursement!.date)}</span>
      ),
    },
    {
      title: 'Loan Account',
      dataIndex: 'loanNumber',
      width: 170,
      render: (v: string) =>
        v ? (
          <Button
            size="small"
            type="link"
            style={{ padding: 0, fontWeight: 600 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/lms/accounts/${v}`);
            }}
          >
            {v}
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  const cols =
    activeTab === 'pending'
      ? pendingCols
      : activeTab === 'emandates'
        ? emandateCols
        : disbursedCols;

  return (
    <div>
      <PageHeader
        title="Finance Operations"
        subtitle={
          scope
            ? `Disbursement desk — ${scope} portfolio`
            : 'Disbursement desk across all loan products'
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `finance-${activeTab}-${dayjs().format('YYYYMMDD')}`,
                ['Application', 'Customer', 'Type', 'Sanctioned', 'Status', 'Created'],
                rows.map((a) => [
                  a.appNumber,
                  a.customer.name,
                  a.loanType,
                  a.creditDecision?.approvedAmount ?? a.loan.amount,
                  a.status,
                  fmtDate(a.createdAt),
                ]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <DataSourceNotice source={source} error={error} onRetry={reload} />

      <MetricBand
        metrics={[
          {
            label: 'Pending Disbursement',
            value: buckets.pending.length,
            sub:
              inrCompact(
                buckets.pending.reduce(
                  (s, a) => s + (a.creditDecision?.approvedAmount ?? a.loan.amount),
                  0,
                ),
              ) + ' sanctioned',
            onClick: () => navigate('/finance/pending'),
          },
          {
            label: 'E-Mandate Pending',
            value: buckets.emandates.length,
            sub: `${buckets.emandates.filter((a) => a.finance?.emandate.status === 'ACTIVE').length} ready to disburse`,
            onClick: () => navigate('/finance/emandates'),
          },
          {
            label: 'Disbursed Today',
            value: disbursedToday.length,
            sub:
              inrCompact(disbursedToday.reduce((s, a) => s + a.finance!.disbursement!.amount, 0)) +
              ' credited',
            onClick: () => navigate('/finance/disbursed'),
          },
          {
            label: 'Total Disbursed',
            value: buckets.disbursed.length,
            sub: 'lifetime conversions',
          },
        ]}
      />

      <Card styles={{ body: { padding: 0 } }}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '16px 18px',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderBottom: '1px solid var(--ink-100)',
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => navigate(`/finance/${v}`)}
            options={[
              { value: 'pending', label: `Pending (${buckets.pending.length})` },
              { value: 'emandates', label: `E-Mandates (${buckets.emandates.length})` },
              { value: 'disbursed', label: `Disbursed (${buckets.disbursed.length})` },
            ]}
          />
          <Input
            prefix={<SearchOutlined className="u-ink-400" />}
            placeholder="Search application, customer…"
            allowClear
            style={{ width: 280, marginLeft: 'auto' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <DataTable<LoanApplication>
          loading={loading}
          dataSource={rows}
          columns={cols}
          rowKey="id"
          size="middle"
          className="row-link"
          scroll={{ x: 1020 }}
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} applications` }}
        />
      </Card>

      <Card
        style={{ border: '1px dashed var(--ink-150)', marginTop: 16, background: 'var(--ink-50)' }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <span className="u-sm u-ink-500">
          <ThunderboltOutlined style={{ color: 'var(--status-info-fg)', marginRight: 8 }} />
          <strong>Finance workflow:</strong> Verify approved amount &amp; bank account → setup NACH
          e-mandate → disburse. Status flows FINANCE_PENDING → EMANDATE_PENDING → DISBURSED; a loan
          account is created in the LMS on disbursal.
        </span>
      </Card>
    </div>
  );
};

export default FinanceQueue;

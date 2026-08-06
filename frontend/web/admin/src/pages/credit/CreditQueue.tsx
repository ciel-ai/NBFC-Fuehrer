import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Segmented } from 'antd';
import type { TableProps } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
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
import { LoanTypeTag, RiskGradeTag, StatusTag, scoreColor } from '../../components/StatusTag';
import CreditDecisionDrawer from '../applications/CreditDecisionDrawer';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import type { LoanApplication } from '../../types';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';

type CreditTab = 'pending' | 'approved' | 'rejected' | 'returned';

const TAB_TITLES: Record<CreditTab, string> = {
  pending: 'Pending Reviews',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
};

const CreditQueue: React.FC = () => {
  const navigate = useNavigate();
  const { tab = 'pending' } = useParams<{ tab: CreditTab }>();
  const activeTab = (
    ['pending', 'approved', 'rejected', 'returned'].includes(tab) ? tab : 'pending'
  ) as CreditTab;
  const user = useAuthStore((s) => s.user)!;
  const { applications, loading, source, error, reload } = useApplications();
  const scope = scopedLoanType(user.role);

  const [search, setSearch] = useState('');
  const [decisionApp, setDecisionApp] = useState<LoanApplication | null>(null);

  const scoped = useMemo(
    () => applications.filter((a) => !scope || a.loanType === scope),
    [applications, scope],
  );

  const buckets = useMemo(
    () => ({
      pending: scoped.filter((a) => a.status === 'CREDIT_PENDING'),
      approved: scoped.filter((a) => a.creditDecision?.decision === 'APPROVED'),
      rejected: scoped.filter((a) => a.status === 'CREDIT_REJECTED'),
      returned: scoped.filter((a) => a.status === 'CREDIT_RETURNED'),
    }),
    [scoped],
  );

  const isToday = (iso?: string): boolean => !!iso && dayjs(iso).isSame(dayjs(), 'day');
  const approvedToday = buckets.approved.filter((a) => isToday(a.creditDecision?.decidedAt)).length;
  const rejectedToday = buckets.rejected.filter((a) => isToday(a.creditDecision?.decidedAt)).length;

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
          <div className="u-xs u-ink-400">+91 {r.customer.mobile}</div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'loanType', width: 95, render: (t) => <LoanTypeTag type={t} /> },
    {
      title: 'Amount / Terms',
      dataIndex: ['loan', 'amount'],
      align: 'right',
      width: 160,
      sorter: (a, b) => a.loan.amount - b.loan.amount,
      render: (_, r) => (
        <div>
          <div className="tnum u-semibold">{inr(r.loan.amount)}</div>
          <div className="u-xs u-ink-400">
            {r.loan.tenureMonths}m @ {r.loan.interestRate}%
          </div>
        </div>
      ),
    },
    {
      title: 'Bureau',
      dataIndex: ['bureau', 'score'],
      width: 90,
      align: 'center',
      sorter: (a, b) => a.bureau.score - b.bureau.score,
      render: (v: number) => (
        <span className="tnum" style={{ fontWeight: 700, color: scoreColor(v) }}>
          {v}
        </span>
      ),
    },
    {
      title: 'FOIR',
      dataIndex: ['customer', 'income', 'foir'],
      width: 80,
      align: 'center',
      render: (v: number) => (
        <span
          className="tnum"
          style={{ fontWeight: 600, color: v <= 55 ? 'var(--ink-600)' : 'var(--status-danger-fg)' }}
        >
          {v}%
        </span>
      ),
    },
  ];

  const pendingCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'In Queue',
      dataIndex: 'createdAt',
      width: 120,
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'ascend',
      render: (v: string) => {
        const days = dayjs().diff(dayjs(v), 'day');
        return (
          <span
            style={{
              fontWeight: 600,
              color:
                days > 4
                  ? 'var(--status-danger-fg)'
                  : days > 2
                    ? 'var(--status-warning-fg)'
                    : 'var(--ink-600)',
              fontSize: 12.5,
            }}
          >
            {days === 0 ? 'Today' : `${days}d`}
          </span>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 200,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/applications/view/${r.id}`);
            }}
          >
            Review
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setDecisionApp(r);
            }}
          >
            Decide
          </Button>
        </div>
      ),
    },
  ];

  const decidedCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'Grade',
      key: 'grade',
      width: 80,
      align: 'center',
      render: (_, r) =>
        r.creditDecision ? <RiskGradeTag grade={r.creditDecision.riskGrade} /> : '—',
    },
    ...(activeTab === 'approved'
      ? [
          {
            title: 'Sanctioned',
            key: 'sanctioned',
            align: 'right' as const,
            width: 130,
            render: (_: unknown, r: LoanApplication) => (
              <span className="tnum u-semibold u-success">
                {inr(r.creditDecision?.approvedAmount ?? r.loan.amount)}
              </span>
            ),
          },
        ]
      : [
          {
            title: 'Reason',
            key: 'reason',
            width: 220,
            render: (_: unknown, r: LoanApplication) => (
              <span className="u-sm u-ink-500">{r.creditDecision?.reason ?? '—'}</span>
            ),
          },
        ]),
    {
      title: 'Decided',
      key: 'decided',
      width: 170,
      render: (_, r) => (
        <div>
          <div className="u-sm u-ink-600">{fmtDateTime(r.creditDecision?.decidedAt)}</div>
          <div className="u-xs u-ink-400">by {r.creditDecision?.decidedBy}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: string) => <StatusTag status={s} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Credit Workbench"
        subtitle={
          scope
            ? `Underwriting queue — ${scope} portfolio`
            : 'Underwriting queue across all loan products'
        }
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `credit-${activeTab}-${dayjs().format('YYYYMMDD')}`,
                [
                  'Application',
                  'Customer',
                  'Type',
                  'Amount',
                  'Bureau',
                  'FOIR %',
                  'Status',
                  'Created',
                ],
                rows.map((a) => [
                  a.appNumber,
                  a.customer.name,
                  a.loanType,
                  a.loan.amount,
                  a.bureau.score,
                  a.customer.income.foir,
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
            label: 'Pending Reviews',
            value: buckets.pending.length,
            sub: 'awaiting decision',
            onClick: () => navigate('/credit/pending'),
          },
          {
            label: 'Approved Today',
            value: approvedToday,
            sub: `${buckets.approved.length} total approved`,
            onClick: () => navigate('/credit/approved'),
          },
          {
            label: 'Rejected Today',
            value: rejectedToday,
            sub: `${buckets.rejected.length} total rejected`,
            onClick: () => navigate('/credit/rejected'),
          },
          {
            label: 'Returned Applications',
            value: buckets.returned.length,
            sub: 'with sales for rework',
            onClick: () => navigate('/credit/returned'),
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
            onChange={(v) => navigate(`/credit/${v}`)}
            options={(['pending', 'approved', 'rejected', 'returned'] as CreditTab[]).map((t) => ({
              value: t,
              label: `${TAB_TITLES[t]} (${buckets[t].length})`,
            }))}
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
          columns={activeTab === 'pending' ? pendingCols : decidedCols}
          rowKey="id"
          size="middle"
          className="row-link"
          scroll={{ x: 980 }}
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} applications` }}
        />
      </Card>

      {activeTab === 'pending' && (
        <Card
          style={{
            border: '1px dashed var(--ink-150)',
            marginTop: 16,
            background: 'var(--ink-50)',
          }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <span className="u-sm u-ink-500">
            <ThunderboltOutlined style={{ color: 'var(--status-warning-fg)', marginRight: 8 }} />
            <strong>Credit workflow:</strong> Open application → verify documents → verify KYC →
            check bureau report → risk assessment → Approve / Reject / Send Back. Decisions are
            final and logged to the audit trail.
          </span>
        </Card>
      )}

      {decisionApp && (
        <CreditDecisionDrawer
          app={decisionApp}
          open={!!decisionApp}
          onClose={() => setDecisionApp(null)}
        />
      )}
    </div>
  );
};

export default CreditQueue;

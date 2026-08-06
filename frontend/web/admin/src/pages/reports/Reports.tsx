import React, { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Result,
  Row,
  Segmented,
  Select,
  Table,
  Tag,
} from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { useApplications } from '../../hooks/useApplications';
import { useLoanBook } from '../../hooks/useLms';
import { useAuthStore } from '../../store/authStore';
import { ROLE_META, scopedLoanType, isAdmin } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import ChartCard, {
  tooltipStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from '../../components/ChartCard';
import { chart } from '../../theme/tokens';
import { exportCsv } from '../../utils/csv';
import { fmtDate, inr, inrCompact, pct } from '../../utils/format';
import {
  approvalStats,
  collectionPerformance,
  disbursementModeSplit,
  dpdBucketDist,
  monthlyDisbursement,
  riskGradeDist,
  weeklyAppTrend,
} from '../../utils/analytics';
import type { LoanType, ReconStatus, ReconciliationRow } from '../../types';
import DataSourceNotice from '../../components/DataSourceNotice';
import { useReconciliation } from '../../hooks/useNach';
import { StatusTag } from '../../components/StatusTag';

const { RangePicker } = DatePicker;

type ReportTab = 'los' | 'credit' | 'finance' | 'collections' | 'reconciliation';

const TAB_LABEL: Record<ReportTab, string> = {
  los: 'LOS Reports',
  credit: 'Credit Reports',
  finance: 'Finance Reports',
  collections: 'Collection Reports',
  reconciliation: 'Reconciliation',
};

/* Reconciliation compares the LMS ledger against what the bank actually settled.
   Only the breaks matter — a matched line needs nobody's attention — so the
   summary leads with the exception count and money at risk, not the match rate. */
const RECON_LABEL: Record<ReconStatus, string> = {
  MATCHED: 'Matched',
  UNMATCHED_IN_BOOK: 'In book, not in bank',
  UNMATCHED_IN_BANK: 'In bank, not in book',
  AMOUNT_MISMATCH: 'Amount mismatch',
};

const StatStrip: React.FC<{ stats: { label: string; value: React.ReactNode }[] }> = ({ stats }) => (
  <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 22px' } }}>
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      {stats.map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'var(--ink-400)',
              marginBottom: 5,
            }}
          >
            {s.label}
          </div>
          <div className="tnum" style={{ fontSize: 21, fontWeight: 700, color: 'var(--ink-900)' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  </Card>
);

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { tab = 'los' } = useParams<{ tab: ReportTab }>();
  const user = useAuthStore((s) => s.user)!;
  const appFeed = useApplications();
  const bookFeed = useLoanBook();
  const { applications } = appFeed;
  const { loans } = bookFeed;
  /* A report drawn from two feeds is only as trustworthy as its weakest one.
     If either fell back to sample data, the whole report is sample data. */
  const source = appFeed.source === 'live' && bookFeed.source === 'live' ? 'live' : appFeed.source;
  const error = appFeed.error ?? bookFeed.error;
  const reload = (): void => {
    appFeed.reload();
    bookFeed.reload();
  };
  // Cross-portfolio repayments have no list-all endpoint yet — sample data
  const repayments = useAppStore((s) => s.repayments);
  const scope = scopedLoanType(user.role);
  const family = ROLE_META[user.role].family;

  /* Reconciliation is a finance function — credit roles have no use for it and
     no business seeing settlement-level bank data. */
  const allowedTabs: ReportTab[] = isAdmin(user.role)
    ? ['los', 'credit', 'finance', 'collections', 'reconciliation']
    : family === 'CREDIT'
      ? ['credit']
      : ['finance', 'reconciliation'];
  const activeTab = (allowedTabs.includes(tab as ReportTab) ? tab : allowedTabs[0]) as ReportTab;

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([
    dayjs().subtract(90, 'day'),
    dayjs(),
  ]);
  const [typeFilter, setTypeFilter] = useState<LoanType | undefined>();

  const effType = scope ?? typeFilter;

  const apps = useMemo(
    () =>
      applications.filter((a) => {
        if (effType && a.loanType !== effType) return false;
        if (range?.[0] && dayjs(a.createdAt).isBefore(range[0].startOf('day'))) return false;
        if (range?.[1] && dayjs(a.createdAt).isAfter(range[1].endOf('day'))) return false;
        return true;
      }),
    [applications, effType, range],
  );

  const lns = useMemo(
    () => loans.filter((l) => !effType || l.loanType === effType),
    [loans, effType],
  );

  /* ── Reconciliation feed ──────────────────────────────────────────────────
     Declared here, above the role-guard return, so the hook order is stable
     regardless of which tab the URL asks for. */
  const reconFeed = useReconciliation();
  const [reconFilter, setReconFilter] = useState<ReconStatus | 'ALL' | 'BREAKS'>('BREAKS');

  const reconAll = useMemo(
    () =>
      reconFeed.data.filter((r) => {
        if (range?.[0] && dayjs(r.date).isBefore(range[0].startOf('day'))) return false;
        if (range?.[1] && dayjs(r.date).isAfter(range[1].endOf('day'))) return false;
        return true;
      }),
    [reconFeed.data, range],
  );

  const reconTally = useMemo(() => {
    const acc: Record<ReconStatus, { count: number; variance: number }> = {
      MATCHED: { count: 0, variance: 0 },
      UNMATCHED_IN_BOOK: { count: 0, variance: 0 },
      UNMATCHED_IN_BANK: { count: 0, variance: 0 },
      AMOUNT_MISMATCH: { count: 0, variance: 0 },
    };
    for (const r of reconAll) {
      acc[r.status].count++;
      acc[r.status].variance += Math.abs(r.bookAmount - r.bankAmount);
    }
    return acc;
  }, [reconAll]);

  const reconBreakCount =
    reconTally.UNMATCHED_IN_BOOK.count +
    reconTally.UNMATCHED_IN_BANK.count +
    reconTally.AMOUNT_MISMATCH.count;
  const reconBreakValue =
    reconTally.UNMATCHED_IN_BOOK.variance +
    reconTally.UNMATCHED_IN_BANK.variance +
    reconTally.AMOUNT_MISMATCH.variance;

  /** Break types as chart slices, each carrying its own colour. */
  const breakSlices = useMemo(
    () =>
      (
        [
          ['UNMATCHED_IN_BOOK', 'overdue'],
          ['UNMATCHED_IN_BANK', 'violet'],
          ['AMOUNT_MISMATCH', 'danger'],
        ] as [ReconStatus, string][]
      )
        .map(([s, tone]) => ({
          name: RECON_LABEL[s],
          value: reconTally[s].count,
          fill: `var(--status-${tone}-fg)`,
        }))
        .filter((d) => d.value > 0),
    [reconTally],
  );

  const reconRows = useMemo(
    () =>
      reconAll.filter((r) =>
        reconFilter === 'ALL'
          ? true
          : reconFilter === 'BREAKS'
            ? r.status !== 'MATCHED'
            : r.status === reconFilter,
      ),
    [reconAll, reconFilter],
  );

  if (!allowedTabs.includes(tab as ReportTab)) {
    return (
      <Result
        status="403"
        title="Report not available for your role"
        extra={
          <Button type="primary" onClick={() => navigate(`/reports/${allowedTabs[0]}`)}>
            Go to {TAB_LABEL[allowedTabs[0]!]}
          </Button>
        }
      />
    );
  }

  // ── shared analytics ──
  const approval = approvalStats(apps);
  const trend = weeklyAppTrend(apps);
  const disb = monthlyDisbursement(lns);
  const collPerf = collectionPerformance(lns);
  const buckets = dpdBucketDist(lns);
  const grades = riskGradeDist(apps);
  const modes = disbursementModeSplit(apps);

  const decided = apps.filter((a) => a.creditDecision);
  const avgTat = decided.length
    ? decided.reduce(
        (s, a) =>
          s +
          Math.max(0.2, dayjs(a.creditDecision!.decidedAt).diff(dayjs(a.createdAt), 'day', true)),
        0,
      ) / decided.length
    : 0;
  const avgBureau = apps.length
    ? Math.round(apps.reduce((s, a) => s + a.bureau.score, 0) / apps.length)
    : 0;

  const disbursedApps = apps.filter((a) => a.finance?.disbursement);
  const feesCollected = disbursedApps.reduce(
    (s, a) => s + (a.finance ? a.finance.fees.processingFee + a.finance.fees.gst : 0),
    0,
  );

  const totalDemand = collPerf.reduce((s, m) => s + m.due, 0);
  const totalCollected = collPerf.reduce((s, m) => s + m.collected, 0);
  const npaLoans = lns.filter((l) => l.status === 'NPA');
  const openBook = lns
    .filter((l) => l.status !== 'CLOSED')
    .reduce((s, l) => s + l.outstandingPrincipal, 0);

  // rejection reasons
  const rejReasons = useMemo(() => {
    const map = new Map<string, number>();
    apps
      .filter((a) => a.creditDecision?.decision === 'REJECTED')
      .forEach((a) => {
        const r = a.creditDecision!.reason ?? 'Other';
        map.set(r, (map.get(r) ?? 0) + 1);
      });
    return [...map.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [apps]);

  // branch summary (LOS)
  const branchSummary = useMemo(() => {
    const map = new Map<
      string,
      { branch: string; count: number; amount: number; disbursed: number }
    >();
    apps.forEach((a) => {
      const e = map.get(a.branch) ?? { branch: a.branch, count: 0, amount: 0, disbursed: 0 };
      e.count += 1;
      e.amount += a.loan.amount;
      if (a.finance?.disbursement) e.disbursed += 1;
      map.set(a.branch, e);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [apps]);

  const sourceSplit = useMemo(() => {
    const map = new Map<string, number>();
    apps.forEach((a) => map.set(a.source, (map.get(a.source) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [apps]);

  const exportReport = (): void => {
    if (activeTab === 'los') {
      exportCsv(
        `los-report-${dayjs().format('YYYYMMDD')}`,
        ['Branch', 'Applications', 'Requested Amount', 'Disbursed Count'],
        branchSummary.map((b) => [b.branch, b.count, b.amount, b.disbursed]),
      );
    } else if (activeTab === 'credit') {
      exportCsv(
        `credit-report-${dayjs().format('YYYYMMDD')}`,
        ['Application', 'Customer', 'Type', 'Bureau', 'Grade', 'Decision', 'Reason', 'Decided At'],
        decided.map((a) => [
          a.appNumber,
          a.customer.name,
          a.loanType,
          a.bureau.score,
          a.creditDecision!.riskGrade,
          a.creditDecision!.decision,
          a.creditDecision!.reason ?? '',
          fmtDate(a.creditDecision!.decidedAt),
        ]),
      );
    } else if (activeTab === 'finance') {
      exportCsv(
        `finance-report-${dayjs().format('YYYYMMDD')}`,
        ['Application', 'Customer', 'Type', 'Sanctioned', 'Net Disbursed', 'Mode', 'UTR', 'Date'],
        disbursedApps.map((a) => [
          a.appNumber,
          a.customer.name,
          a.loanType,
          a.creditDecision?.approvedAmount ?? a.loan.amount,
          a.finance!.disbursement!.amount,
          a.finance!.disbursement!.mode,
          a.finance!.disbursement!.utr,
          fmtDate(a.finance!.disbursement!.date),
        ]),
      );
    } else if (activeTab === 'reconciliation') {
      exportCsv(
        `reconciliation-report-${dayjs().format('YYYYMMDD')}`,
        [
          'Date',
          'Loan',
          'Customer',
          'Channel',
          'Reference',
          'Book Amount',
          'Bank Amount',
          'Variance',
          'Status',
          'Remarks',
        ],
        reconRows.map((r) => [
          fmtDate(r.date),
          r.loanNumber ?? '',
          r.customerName ?? '',
          r.channel,
          r.reference,
          r.bookAmount,
          r.bankAmount,
          r.bookAmount - r.bankAmount,
          r.status,
          r.note ?? '',
        ]),
      );
    } else {
      exportCsv(
        `collections-report-${dayjs().format('YYYYMMDD')}`,
        ['Bucket', 'Accounts', 'Outstanding'],
        buckets.map((b) => [b.bucket, b.count, b.outstanding]),
      );
    }
  };

  const reconCols: TableProps<ReconciliationRow>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 120,
      render: (v: string) => <span className="u-sm u-ink-600">{fmtDate(v)}</span>,
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Loan / Customer',
      key: 'loan',
      render: (_, r) =>
        r.loanNumber ? (
          <div>
            <div className="u-semibold u-accent u-sm">{r.loanNumber}</div>
            <div className="u-xs u-ink-400">{r.customerName}</div>
          </div>
        ) : (
          /* An unallocated bank credit has no loan yet — that IS the finding. */
          <span className="u-xs u-ink-400">Unallocated credit</span>
        ),
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      width: 110,
      render: (v: string) => <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      width: 160,
      render: (v: string) => <span className="tnum u-sm u-ink-500">{v}</span>,
    },
    {
      title: 'Book',
      dataIndex: 'bookAmount',
      align: 'right',
      width: 120,
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    {
      title: 'Bank',
      dataIndex: 'bankAmount',
      align: 'right',
      width: 120,
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    {
      title: 'Variance',
      key: 'variance',
      align: 'right',
      width: 120,
      render: (_, r) => {
        const v = r.bookAmount - r.bankAmount;
        return (
          <span
            className="tnum u-semibold"
            style={{ color: v === 0 ? 'var(--ink-400)' : 'var(--status-danger-fg)' }}
          >
            {v === 0 ? '—' : inr(v)}
          </span>
        );
      },
      sorter: (a, b) =>
        Math.abs(a.bookAmount - a.bankAmount) - Math.abs(b.bookAmount - b.bankAmount),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (s: ReconStatus) => <StatusTag status={s} />,
    },
    {
      title: 'Remarks',
      dataIndex: 'note',
      width: 260,
      render: (v?: string) => <span className="u-xs u-ink-500">{v ?? '—'}</span>,
    },
  ];

  const branchCols: TableProps<(typeof branchSummary)[number]>['columns'] = [
    {
      title: 'Branch',
      dataIndex: 'branch',
      render: (v: string) => <span className="u-semibold">{v}</span>,
    },
    {
      title: 'Applications',
      dataIndex: 'count',
      align: 'right',
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Requested Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    { title: 'Disbursed', dataIndex: 'disbursed', align: 'right' },
    {
      title: 'Conversion',
      key: 'conv',
      align: 'right',
      render: (_, r) => (
        <span className="tnum u-semibold">
          {pct(r.count ? (r.disbursed / r.count) * 100 : 0, 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="print-area">
      <PageHeader
        title="Reports & Analytics"
        subtitle={`Regulatory-grade MIS across origination, credit, finance and collections`}
        extra={
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <Button
              icon={<FilePdfOutlined />}
              onClick={() => {
                message.info('Preparing print-ready PDF…');
                setTimeout(() => window.print(), 300);
              }}
            >
              PDF
            </Button>
            <Button icon={<FileExcelOutlined />} onClick={exportReport}>
              Excel
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportReport}>
              CSV
            </Button>
          </div>
        }
      />

      {/* The reconciliation tab draws on a different feed, so it must report its
          own provenance rather than inherit the loan book's. */}
      {activeTab === 'reconciliation' ? (
        <DataSourceNotice
          source={reconFeed.source}
          error={reconFeed.error}
          onRetry={reconFeed.reload}
        />
      ) : (
        <DataSourceNotice source={source} error={error} onRetry={reload} />
      )}

      <Card
        className="no-print"
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Segmented
            value={activeTab}
            onChange={(v) => navigate(`/reports/${v}`)}
            options={allowedTabs.map((t) => ({ value: t, label: TAB_LABEL[t] }))}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!scope && (
              <Select
                aria-label="All Products"
                placeholder="All Products"
                allowClear
                style={{ width: 170 }}
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'CDL', label: 'Consumer Durable' },
                  { value: 'GOLD', label: 'Gold Loan' },
                  { value: 'HOUSING', label: 'Affordable Housing' },
                ]}
              />
            )}
            <RangePicker
              value={range as any}
              onChange={(v) => setRange(v as any)}
              style={{ width: 260 }}
            />
          </div>
        </div>
      </Card>

      {/* ════ LOS ════ */}
      {activeTab === 'los' && (
        <>
          <StatStrip
            stats={[
              { label: 'Applications', value: apps.length },
              {
                label: 'Requested Value',
                value: inrCompact(apps.reduce((s, a) => s + a.loan.amount, 0)),
              },
              { label: 'Approval Ratio', value: `${approval.ratio}%` },
              { label: 'Converted to Loans', value: disbursedApps.length },
              {
                label: 'Avg Ticket Size',
                value: apps.length
                  ? inrCompact(apps.reduce((s, a) => s + a.loan.amount, 0) / apps.length)
                  : '—',
              },
            ]}
          />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard
                title="Application Trends"
                subtitle="Weekly intake by product"
                height={270}
              >
                <ResponsiveContainer>
                  <AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke={chart.CDL}
                      strokeWidth={2.4}
                      fill={chart.CDL + '18'}
                    />
                    <Area
                      type="monotone"
                      dataKey="GOLD"
                      name="Gold"
                      stroke={chart.GOLD}
                      strokeWidth={1.6}
                      fill="transparent"
                    />
                    <Area
                      type="monotone"
                      dataKey="HOUSING"
                      name="Housing"
                      stroke={chart.HOUSING}
                      strokeWidth={1.6}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard
                title="Sourcing Channels"
                subtitle="Application share by origin"
                height={270}
              >
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={sourceSplit}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {sourceSplit.map((s, i) => (
                        <Cell
                          key={s.name}
                          fill={[chart.CDL, chart.positive, chart.GOLD, chart.HOUSING][i % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card
                styles={{ body: { padding: '8px 10px' } }}
                title={<span className="u-md u-semibold">Branch-wise Performance</span>}
              >
                <Table
                  dataSource={branchSummary}
                  columns={branchCols}
                  rowKey="branch"
                  size="small"
                  pagination={false}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ════ CREDIT ════ */}
      {activeTab === 'credit' && (
        <>
          <StatStrip
            stats={[
              { label: 'Decisions Made', value: decided.length },
              { label: 'Approval Rate', value: `${approval.ratio}%` },
              { label: 'Avg Decision TAT', value: `${avgTat.toFixed(1)} days` },
              { label: 'Avg Bureau Score', value: avgBureau },
              { label: 'Returned for Rework', value: approval.returned },
            ]}
          />
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <ChartCard title="Approval Rates" subtitle="Decision outcomes" height={260}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Approved', value: approval.approved },
                        { name: 'Rejected', value: approval.rejected },
                        { name: 'Returned', value: approval.returned },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="82%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      <Cell fill={chart.positive} />
                      <Cell fill={chart.negative} />
                      <Cell fill="var(--status-violet-fg)" />
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} md={8}>
              <ChartCard
                title="Risk Grade Distribution"
                subtitle="Underwriting grades assigned"
                height={260}
              >
                <ResponsiveContainer>
                  <BarChart data={grades} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="grade"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]} maxBarSize={34}>
                      {grades.map((g, i) => (
                        <Cell
                          key={g.grade}
                          fill={
                            [
                              'var(--status-success-fg)',
                              'var(--status-success-fg)',
                              'var(--status-warning-fg)',
                              'var(--status-danger-fg)',
                            ][i]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} md={8}>
              <ChartCard title="Rejection Reasons" subtitle="Top decline drivers" height={260}>
                <ResponsiveContainer>
                  <BarChart
                    data={rejReasons}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid stroke={chart.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="reason"
                      width={150}
                      tick={{ fontSize: 10.5, fill: 'var(--ink-500)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar
                      dataKey="count"
                      name="Declines"
                      fill={chart.negative}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
          </Row>
        </>
      )}

      {/* ════ FINANCE ════ */}
      {activeTab === 'finance' && (
        <>
          <StatStrip
            stats={[
              { label: 'Loans Disbursed', value: disbursedApps.length },
              {
                label: 'Amount Disbursed',
                value: inrCompact(
                  disbursedApps.reduce((s, a) => s + a.finance!.disbursement!.amount, 0),
                ),
              },
              { label: 'Fees + GST Collected', value: inrCompact(feesCollected) },
              {
                label: 'Avg Ticket',
                value: disbursedApps.length
                  ? inrCompact(
                      disbursedApps.reduce((s, a) => s + a.finance!.disbursement!.amount, 0) /
                        disbursedApps.length,
                    )
                  : '—',
              },
            ]}
          />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard
                title="Disbursement Trends"
                subtitle="Monthly disbursed principal"
                height={270}
              >
                <ResponsiveContainer>
                  <BarChart data={disb} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => inrCompact(v)}
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                      width={62}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v) => inr(Number(v))}
                    />
                    <Bar
                      dataKey="amount"
                      name="Disbursed"
                      fill={chart.CDL}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard title="Payout Modes" subtitle="NEFT / RTGS / IMPS split" height={270}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={modes}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {modes.map((m, i) => (
                        <Cell
                          key={m.name}
                          fill={[chart.CDL, chart.neutral, chart.positive][i % 3]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card
                styles={{ body: { padding: '8px 10px' } }}
                title={<span className="u-md u-semibold">Recent Disbursements</span>}
              >
                <Table
                  dataSource={disbursedApps.slice(0, 8)}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Application',
                      dataIndex: 'appNumber',
                      render: (v: string) => <span className="u-semibold u-accent u-sm">{v}</span>,
                    },
                    { title: 'Customer', render: (_: unknown, r: any) => r.customer.name },
                    {
                      title: 'Net Disbursed',
                      align: 'right' as const,
                      render: (_: unknown, r: any) => (
                        <span className="tnum u-semibold">
                          {inr(r.finance.disbursement.amount)}
                        </span>
                      ),
                    },
                    { title: 'Mode', render: (_: unknown, r: any) => r.finance.disbursement.mode },
                    {
                      title: 'UTR',
                      render: (_: unknown, r: any) => (
                        <span className="tnum u-sm u-ink-500">{r.finance.disbursement.utr}</span>
                      ),
                    },
                    {
                      title: 'Date',
                      render: (_: unknown, r: any) => fmtDate(r.finance.disbursement.date),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ════ COLLECTIONS ════ */}
      {activeTab === 'collections' && (
        <>
          <StatStrip
            stats={[
              { label: 'Demand (6m)', value: inrCompact(totalDemand) },
              { label: 'Collected (6m)', value: inrCompact(totalCollected) },
              {
                label: 'Collection Efficiency',
                value: `${totalDemand ? Math.round((totalCollected / totalDemand) * 100) : 100}%`,
              },
              { label: 'NPA Accounts', value: npaLoans.length },
              {
                label: 'GNPA %',
                value: openBook
                  ? pct((npaLoans.reduce((s, l) => s + l.outstandingPrincipal, 0) / openBook) * 100)
                  : '0%',
              },
              {
                label: 'Recovery Receipts',
                value: repayments.filter((r) => r.type === 'RECOVERY').length,
              },
            ]}
          />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard
                title="Recovery Performance"
                subtitle="Collection efficiency % by month"
                height={270}
              >
                <ResponsiveContainer>
                  <LineChart data={collPerf} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v) => `${v}%`}
                    />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      name="Efficiency"
                      stroke={chart.positive}
                      strokeWidth={2.6}
                      dot={{ r: 4, fill: chart.positive }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard
                title="Delinquency Buckets"
                subtitle="Open accounts by DPD band"
                height={270}
              >
                <ResponsiveContainer>
                  <BarChart data={buckets} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--ink-400)' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Bar dataKey="count" name="Accounts" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {buckets.map((b, i) => (
                        <Cell
                          key={b.bucket}
                          fill={
                            [
                              'var(--status-success-fg)',
                              'var(--status-warning-fg)',
                              'var(--status-overdue-fg)',
                              'var(--status-danger-fg)',
                              'var(--status-danger-fg)',
                            ][i]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card
                styles={{ body: { padding: '8px 10px' } }}
                title={<span className="u-md u-semibold">Bucket Summary</span>}
              >
                <Table
                  dataSource={buckets}
                  rowKey="bucket"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'DPD Bucket',
                      dataIndex: 'bucket',
                      render: (v: string) => <span className="u-semibold">{v}</span>,
                    },
                    { title: 'Accounts', dataIndex: 'count', align: 'right' as const },
                    {
                      title: 'Outstanding',
                      dataIndex: 'outstanding',
                      align: 'right' as const,
                      render: (v: number) => <span className="tnum">{inr(v)}</span>,
                    },
                    {
                      title: 'Share of Book',
                      key: 'share',
                      align: 'right' as const,
                      render: (_: unknown, r: any) => (
                        <span className="tnum u-semibold">
                          {openBook ? pct((r.outstanding / openBook) * 100) : '0%'}
                        </span>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ════ RECONCILIATION ════ */}
      {activeTab === 'reconciliation' && (
        <>
          <StatStrip
            stats={[
              { label: 'Lines Compared', value: reconAll.length },
              {
                label: 'Matched',
                value: (
                  <span style={{ color: 'var(--status-success-fg)' }}>
                    {reconTally.MATCHED.count}
                  </span>
                ),
              },
              {
                label: 'Breaks',
                value: (
                  <span
                    style={{
                      color: reconBreakCount
                        ? 'var(--status-danger-fg)'
                        : 'var(--status-success-fg)',
                    }}
                  >
                    {reconBreakCount}
                  </span>
                ),
              },
              { label: 'Value in Break', value: inrCompact(reconBreakValue) },
              {
                label: 'Match Rate',
                value: reconAll.length
                  ? pct((reconTally.MATCHED.count / reconAll.length) * 100, 1)
                  : '—',
              },
            ]}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={9}>
              <ChartCard
                title="Break Composition"
                subtitle="Where book and bank disagree"
                height={270}
              >
                <ResponsiveContainer>
                  <PieChart>
                    {/* The colour travels WITH the datum. Recharts matches Cells
                        to slices by index, so a fixed colour array silently
                        re-colours every slice as soon as one break type is
                        empty and drops out of the filter. */}
                    <Pie
                      data={breakSlices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {breakSlices.map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={15}>
              <Card
                styles={{ body: { padding: 0 } }}
                title={<span className="u-md u-semibold">Break Register</span>}
                extra={
                  <Segmented
                    className="no-print"
                    size="small"
                    value={reconFilter}
                    onChange={(v) => setReconFilter(v as ReconStatus | 'ALL' | 'BREAKS')}
                    options={[
                      { value: 'BREAKS', label: `Breaks (${reconBreakCount})` },
                      { value: 'ALL', label: `All (${reconAll.length})` },
                      {
                        value: 'UNMATCHED_IN_BOOK',
                        label: `Book only (${reconTally.UNMATCHED_IN_BOOK.count})`,
                      },
                      {
                        value: 'UNMATCHED_IN_BANK',
                        label: `Bank only (${reconTally.UNMATCHED_IN_BANK.count})`,
                      },
                      {
                        value: 'AMOUNT_MISMATCH',
                        label: `Mismatch (${reconTally.AMOUNT_MISMATCH.count})`,
                      },
                    ]}
                  />
                }
              >
                <Table<ReconciliationRow>
                  loading={reconFeed.loading}
                  dataSource={reconRows}
                  columns={reconCols}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `${t} lines` }}
                  scroll={{ x: 1250 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Reports;

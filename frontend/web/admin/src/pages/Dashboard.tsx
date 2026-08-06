import React, { useMemo } from 'react';
import { Button } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useDashboardSummary } from '../hooks/useDashboard';
import { LOAN_TYPE_META, ROLE_META, scopedLoanType } from '../auth/rbac';
import ChartCard, {
  axisProps,
  gridProps,
  tooltipItemStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from '../components/ChartCard';
import DataTable, { useDensity } from '../components/DataTable';
import { MetricBand } from '../components/KpiCard';
import type { Metric } from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import Panel from '../components/Panel';
import { LoanTypeTag, StatusTag } from '../components/StatusTag';
import { chart, radius } from '../theme/tokens';
import type { StatusTone } from '../theme/tokens';
import { fmtTimeAgo, initials, inr, inrCompact } from '../utils/format';
import {
  approvalStats,
  collectionPerformance,
  monthlyDisbursement,
  recoveryThisMonth,
} from '../utils/analytics';
import type { AuditLog, LoanApplication } from '../types';
import DataSourceNotice from '../components/DataSourceNotice';
import './Dashboard.css';

const isToday = (iso?: string): boolean => !!iso && dayjs(iso).isSame(dayjs(), 'day');

/** A worklist item — something a human must act on. Tone is semantic. */
interface ActionItem {
  icon: React.ReactNode;
  title: string;
  sub: string;
  to: string;
  tone: StatusTone;
}

const BAR_RADIUS: [number, number, number, number] = [radius.sm, radius.sm, 0, 0];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const auditLogs = useAppStore((s) => s.auditLogs);
  const repayments = useAppStore((s) => s.repayments);
  const [density] = useDensity();

  const scope = scopedLoanType(user.role);
  const meta = ROLE_META[user.role];

  /* Branch on role FAMILY, not on the literal 'ADMIN' role. The API also issues
     SUPER_ADMIN, which is an admin in every respect — comparing against the
     string 'ADMIN' silently dropped it into the finance branch and then
     dereferenced its (undefined) loan-type scope. */
  const isAdmin = meta.family === 'ADMIN';

  const apps = useMemo(
    () => applications.filter((a) => !scope || a.loanType === scope),
    [applications, scope],
  );
  const lns = useMemo(() => loans.filter((l) => !scope || l.loanType === scope), [loans, scope]);

  const counts = useMemo(() => {
    const c = (s: string[]): number => apps.filter((a) => s.includes(a.status)).length;
    const approvedToday = apps.filter(
      (a) => a.creditDecision?.decision === 'APPROVED' && isToday(a.creditDecision.decidedAt),
    ).length;
    const rejectedToday = apps.filter(
      (a) => a.creditDecision?.decision === 'REJECTED' && isToday(a.creditDecision.decidedAt),
    ).length;
    const disbursedToday = apps.filter((a) => isToday(a.finance?.disbursement?.date));
    const dueToday = lns.filter(
      (l) => l.status !== 'CLOSED' && l.nextDueDate === dayjs().format('YYYY-MM-DD'),
    );
    const overdueAmt = lns.reduce((s, l) => s + l.overdueAmount, 0);
    return {
      total: apps.length,
      submitted: c(['SUBMITTED']),
      creditPending: c(['CREDIT_PENDING']),
      financePending: c(['CREDIT_APPROVED', 'FINANCE_PENDING', 'EMANDATE_PENDING']),
      emandatePending: c(['EMANDATE_PENDING']),
      returned: c(['CREDIT_RETURNED']),
      approvedToday,
      rejectedToday,
      disbursedToday: disbursedToday.length,
      disbursedTodayAmt: disbursedToday.reduce(
        (s, a) => s + (a.finance?.disbursement?.amount ?? 0),
        0,
      ),
      activeLoans: lns.filter((l) => l.status !== 'CLOSED').length,
      collectionDue: dueToday.reduce((s, l) => s + l.emi, 0) + overdueAmt,
      dueTodayCount: dueToday.length,
      overdueAmt,
      npa: lns.filter((l) => l.status === 'NPA').length,
      npaOutstanding: lns
        .filter((l) => l.status === 'NPA')
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
      recovered: recoveryThisMonth(repayments.filter((r) => !scope || r.loanType === scope)),
      bookSize: lns
        .filter((l) => l.status !== 'CLOSED')
        .reduce((s, l) => s + l.outstandingPrincipal, 0),
    };
  }, [apps, lns, repayments, scope]);

  // ── live summary (real API) with labelled sample-data fallback ──────────────
  const { summary: liveSummary, live, source, error, reload } = useDashboardSummary();

  const approval = useMemo(
    () =>
      live && liveSummary
        ? {
            ratio: liveSummary.approvalRatio.approvalRate,
            approved: liveSummary.approvalRatio.approved,
            rejected: liveSummary.approvalRatio.rejected,
          }
        : approvalStats(apps),
    [live, liveSummary, apps],
  );

  const disbTrend = useMemo(
    () =>
      live && liveSummary
        ? liveSummary.disbursementTrend.map((m) => ({ month: m.month, amount: m.amount / 100 }))
        : monthlyDisbursement(lns),
    [live, liveSummary, lns],
  );

  const collPerf = useMemo(
    () =>
      live && liveSummary
        ? liveSummary.collectionPerformance.map((m) => ({
            month: m.month,
            collected: m.amount / 100,
          }))
        : collectionPerformance(lns),
    [live, liveSummary, lns],
  );

  const recentApps = useMemo<LoanApplication[]>(
    () =>
      live && liveSummary
        ? liveSummary.recentApplications.map(
            (r) =>
              ({
                id: r.id,
                appNumber: `FHR-${new Date(r.applied_at).getFullYear()}-${r.id.replace(/-/g, '').slice(-5).toUpperCase()}`,
                loanType: 'CDL',
                status: r.status,
                customer: { name: r.user?.full_name ?? '—' },
                loan: { amount: Number(r.approved_amount ?? r.amount_requested) / 100 },
                createdAt: r.applied_at,
              }) as unknown as LoanApplication,
          )
        : apps.slice(0, 7),
    [live, liveSummary, apps],
  );

  const activities = useMemo<AuditLog[]>(
    () =>
      live && liveSummary
        ? liveSummary.recentActivities.map(
            (a) =>
              ({
                id: a.id,
                user: a.role ?? 'System',
                role: a.role ?? 'SYSTEM',
                module: a.entity_type ?? '—',
                action: a.action.replace(/_/g, ' '),
                entity: a.entity_type ?? '—',
                at: a.created_at,
                ip: '',
              }) as AuditLog,
          )
        : auditLogs.slice(0, 7),
    [live, liveSummary, auditLogs],
  );

  // ── role-aware metric band ─────────────────────────────────────────────────
  const metrics = useMemo<Metric[]>(() => {
    if (isAdmin) {
      return [
        {
          label: 'Open applications',
          value: counts.total - counts.disbursedToday,
          sub: `${counts.submitted} new today`,
          onClick: () => navigate('/applications'),
        },
        {
          label: 'Credit queue',
          value: counts.creditPending,
          sub: 'Awaiting underwriting',
          onClick: () => navigate('/applications/credit-pending'),
        },
        {
          label: 'Finance queue',
          value: counts.financePending,
          sub: `${counts.emandatePending} at e-mandate`,
          onClick: () => navigate('/applications/finance-pending'),
        },
        {
          label: 'Disbursed today',
          value: inrCompact(counts.disbursedTodayAmt),
          sub: `${counts.disbursedToday} loans`,
          onClick: () => navigate('/finance/disbursed'),
        },
        {
          label: 'Live book',
          value: inrCompact(counts.bookSize),
          sub: `${counts.activeLoans} active loans`,
          onClick: () => navigate('/lms/accounts'),
        },
        {
          label: 'NPA',
          value: counts.npa,
          sub: `${inrCompact(counts.npaOutstanding)} at risk`,
          onClick: () => navigate('/collections/npa'),
        },
      ];
    }
    if (meta.family === 'CREDIT') {
      return [
        {
          label: 'Pending reviews',
          value: counts.creditPending,
          sub: `${counts.submitted} just submitted`,
          onClick: () => navigate('/credit/pending'),
        },
        {
          label: 'Approved today',
          value: counts.approvedToday,
          sub: 'Moved to finance',
          onClick: () => navigate('/credit/approved'),
        },
        {
          label: 'Rejected today',
          value: counts.rejectedToday,
          sub: 'Policy declines',
          onClick: () => navigate('/credit/rejected'),
        },
        {
          label: 'Returned',
          value: counts.returned,
          sub: 'Sent back to sales',
          onClick: () => navigate('/credit/returned'),
        },
        {
          label: 'Approval ratio',
          value: `${approval.ratio}%`,
          sub: 'On completed reviews',
          onClick: () => navigate('/credit/approved'),
        },
      ];
    }
    return [
      {
        label: 'Pending disbursement',
        value: counts.financePending,
        sub: 'Approved by credit',
        onClick: () => navigate('/finance/pending'),
      },
      {
        label: 'E-mandate pending',
        value: counts.emandatePending,
        sub: 'NPCI registration',
        onClick: () => navigate('/finance/emandates'),
      },
      {
        label: 'Disbursed today',
        value: inrCompact(counts.disbursedTodayAmt),
        sub: `${counts.disbursedToday} loans`,
        onClick: () => navigate('/finance/disbursed'),
      },
      {
        label: 'Live book',
        value: inrCompact(counts.bookSize),
        sub: `${counts.activeLoans} active loans`,
        onClick: () => navigate('/lms/accounts'),
      },
    ];
  }, [isAdmin, meta.family, counts, approval.ratio, navigate]);

  // ── needs-action worklist ──────────────────────────────────────────────────
  const actions = useMemo<ActionItem[]>(() => {
    if (live && liveSummary) {
      const byType: Record<string, Omit<ActionItem, 'title'> & { title: (n: number) => string }> = {
        CREDIT_REVIEW: {
          icon: <SafetyCertificateOutlined />,
          title: (n) => `${n} application${n > 1 ? 's' : ''} awaiting credit review`,
          sub: 'Underwriting complete — pending decision',
          to: meta.family === 'CREDIT' ? '/credit/pending' : '/applications/credit-pending',
          tone: 'warning',
        },
        FINANCE_DISBURSEMENT: {
          icon: <BankOutlined />,
          title: (n) => `${n} approval${n > 1 ? 's' : ''} awaiting disbursement`,
          sub: 'Approved by credit — pending fund release',
          to: meta.family === 'FINANCE' ? '/finance/pending' : '/applications/finance-pending',
          tone: 'info',
        },
      };
      return liveSummary.pendingActions
        .filter((a) => byType[a.type])
        .map((a) => {
          const m = byType[a.type]!;
          return { icon: m.icon, title: m.title(a.count), sub: m.sub, to: m.to, tone: m.tone };
        });
    }

    const list: ActionItem[] = [];
    if (meta.family !== 'FINANCE') {
      if (counts.submitted)
        list.push({
          icon: <FileTextOutlined />,
          title: `${counts.submitted} new application${counts.submitted > 1 ? 's' : ''} awaiting credit pickup`,
          sub: 'Sourced via the mobile sales app',
          to: '/applications/submitted',
          tone: 'info',
        });
      if (counts.creditPending)
        list.push({
          icon: <SafetyCertificateOutlined />,
          title: `${counts.creditPending} application${counts.creditPending > 1 ? 's' : ''} in the credit review queue`,
          sub: 'KYC, bureau and document checks pending',
          to: meta.family === 'CREDIT' ? '/credit/pending' : '/applications/credit-pending',
          tone: 'warning',
        });
    }
    if (meta.family !== 'CREDIT') {
      const financeOnly = counts.financePending - counts.emandatePending;
      if (financeOnly > 0)
        list.push({
          icon: <BankOutlined />,
          title: `${financeOnly} approval${financeOnly > 1 ? 's' : ''} awaiting finance processing`,
          sub: 'Verify fees, bank details and penny-drop',
          to: meta.family === 'FINANCE' ? '/finance/pending' : '/applications/finance-pending',
          tone: 'info',
        });
      if (counts.emandatePending)
        list.push({
          icon: <ThunderboltOutlined />,
          title: `${counts.emandatePending} e-mandate${counts.emandatePending > 1 ? 's' : ''} in NACH registration`,
          sub: 'Awaiting NPCI authentication',
          to: meta.family === 'FINANCE' ? '/finance/emandates' : '/applications',
          tone: 'violet',
        });
    }
    if (isAdmin) {
      if (counts.dueTodayCount)
        list.push({
          icon: <PhoneOutlined />,
          title: `${counts.dueTodayCount} EMI${counts.dueTodayCount > 1 ? 's' : ''} due for collection today`,
          sub: `${inr(counts.collectionDue)} collectible including overdue`,
          to: '/collections/due-today',
          tone: 'success',
        });
      if (counts.npa)
        list.push({
          icon: <WarningOutlined />,
          title: `${counts.npa} NPA account${counts.npa > 1 ? 's' : ''} under recovery`,
          sub: `${inrCompact(counts.npaOutstanding)} outstanding`,
          to: '/collections/npa',
          tone: 'danger',
        });
    }
    return list;
  }, [live, liveSummary, counts, meta.family, isAdmin]);

  // ── portfolio panel ────────────────────────────────────────────────────────
  const summary = useMemo<{ label: string; value: React.ReactNode }[]>(() => {
    if (isAdmin) {
      return [
        { label: 'Live book size', value: inrCompact(counts.bookSize) },
        { label: 'Disbursed today', value: inrCompact(counts.disbursedTodayAmt) },
        { label: 'Recovered (MTD)', value: inrCompact(counts.recovered) },
        { label: 'Overdue outstanding', value: inrCompact(counts.overdueAmt) },
        { label: 'Approval ratio', value: `${approval.ratio}%` },
        { label: 'Active loans', value: counts.activeLoans },
      ];
    }
    if (meta.family === 'CREDIT') {
      return [
        { label: 'In queue', value: counts.creditPending },
        { label: 'Approved today', value: counts.approvedToday },
        { label: 'Rejected today', value: counts.rejectedToday },
        { label: 'Returned', value: counts.returned },
        { label: 'Approval ratio', value: `${approval.ratio}%` },
      ];
    }
    return [
      { label: 'Pending disbursement', value: counts.financePending },
      { label: 'E-mandate pending', value: counts.emandatePending },
      { label: 'Disbursed today', value: inrCompact(counts.disbursedTodayAmt) },
      { label: 'Live book size', value: inrCompact(counts.bookSize) },
      { label: 'Active loans', value: counts.activeLoans },
    ];
  }, [isAdmin, meta.family, counts, approval.ratio]);

  const cols: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application',
      dataIndex: 'appNumber',
      render: (v: string, r) => (
        <div>
          <div className="cell-ref">{v}</div>
          <div className="cell-sub">{r.customer.name}</div>
        </div>
      ),
    },
    {
      title: 'Product',
      dataIndex: 'loanType',
      width: 130,
      render: (t) => <LoanTypeTag type={t} full />,
    },
    {
      title: 'Amount',
      dataIndex: ['loan', 'amount'],
      width: 130,
      className: 'col-num',
      render: (v: number) => <span className="cell-money">{inr(v)}</span>,
    },
    {
      title: 'Stage',
      dataIndex: 'status',
      width: 160,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Age',
      dataIndex: 'createdAt',
      width: 110,
      render: (v: string) => <span className="cell-sub">{fmtTimeAgo(v)}</span>,
    },
  ];

  const pageTitle = isAdmin
    ? 'Operations'
    : meta.family === 'CREDIT'
      ? 'Credit Workbench'
      : 'Finance Operations';

  const needAction = actions.length;
  const subtitle = `${
    needAction > 0
      ? `${needAction} item${needAction > 1 ? 's' : ''} need your attention${
          isAdmin ? ` · ${inrCompact(counts.collectionDue)} collectible today` : ''
        }`
      : 'You are all caught up — nothing needs action right now'
  }`;

  const showCharts = isAdmin || meta.family === 'FINANCE';

  return (
    <div className="page">
      <PageHeader
        title={pageTitle}
        subtitle={subtitle}
        extra={<span className="t-meta tnum">{dayjs().format('ddd, DD MMM YYYY')}</span>}
      />

      <DataSourceNotice source={source} error={error} onRetry={reload} />

      <MetricBand metrics={metrics} />

      <div className="dash-split">
        <Panel
          title="Needs action"
          count={needAction}
          countTone={needAction > 0 ? 'attention' : 'neutral'}
          flush
        >
          {needAction === 0 ? (
            <div className="state-view">
              <span className="state-view__icon u-success">
                <CheckCircleOutlined style={{ fontSize: 28 }} />
              </span>
              <p className="state-view__title">All clear</p>
              <p className="state-view__detail">No applications or accounts are waiting on you.</p>
            </div>
          ) : (
            actions.map((a) => (
              <button
                key={a.title}
                type="button"
                className="work-row"
                onClick={() => navigate(a.to)}
              >
                <span className={`work-row__slot tone-${a.tone}`}>{a.icon}</span>
                <span className="grow">
                  <span className="work-row__title">{a.title}</span>
                  <span className="work-row__sub">{a.sub}</span>
                </span>
                <ArrowRightOutlined className="work-row__go" />
              </button>
            ))
          )}
        </Panel>

        <Panel
          title={isAdmin ? 'Portfolio' : 'Summary'}
          extra={
            <span className="t-meta">{scope ? LOAN_TYPE_META[scope].short : 'All products'}</span>
          }
          flush
        >
          {summary.map((s) => (
            <div key={s.label} className="stat-row">
              <span className="stat-row__label">{s.label}</span>
              <span className="stat-row__value">{s.value}</span>
            </div>
          ))}
        </Panel>
      </div>

      <Panel
        title="Recent applications"
        extra={
          <Button type="link" size="small" onClick={() => navigate('/applications')}>
            View all <ArrowRightOutlined />
          </Button>
        }
        flush
      >
        <DataTable<LoanApplication>
          density={density}
          dataSource={recentApps}
          columns={cols}
          rowKey="id"
          pagination={false}
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
        />
      </Panel>

      {(showCharts || isAdmin) && (
        <div className={isAdmin ? 'dash-split' : ''}>
          {showCharts && (
            <div className="dash-charts">
              <ChartCard
                title="Disbursement"
                subtitle="Monthly principal — last 6 months"
                height={200}
              >
                <ResponsiveContainer>
                  <BarChart data={disbTrend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" {...axisProps} />
                    <YAxis tickFormatter={(v: number) => inrCompact(v)} width={56} {...axisProps} />
                    <Tooltip
                      cursor={{ fill: 'var(--ink-50)' }}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v) => inr(Number(v))}
                    />
                    <Bar
                      dataKey="amount"
                      name="Disbursed"
                      fill={chart.CDL}
                      radius={BAR_RADIUS}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Collections" subtitle="Demand vs collected" height={200}>
                <ResponsiveContainer>
                  <BarChart
                    data={collPerf}
                    margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="month" {...axisProps} />
                    <YAxis tickFormatter={(v: number) => inrCompact(v)} width={56} {...axisProps} />
                    <Tooltip
                      cursor={{ fill: 'var(--ink-50)' }}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v) => inr(Number(v))}
                    />
                    <Bar
                      dataKey="due"
                      name="Demand"
                      fill={chart.grid}
                      radius={BAR_RADIUS}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="collected"
                      name="Collected"
                      fill={chart.positive}
                      radius={BAR_RADIUS}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {isAdmin && (
            <Panel
              title="Recent activity"
              extra={
                <Button type="link" size="small" onClick={() => navigate('/audit')}>
                  Audit log
                </Button>
              }
              flush
            >
              {activities.map((item) => (
                <div key={item.id} className="activity-row">
                  <span className="activity-row__who">{initials(item.user)}</span>
                  <div className="grow">
                    <div className="work-row__title truncate">{item.action}</div>
                    <div className="work-row__sub">
                      {item.user} · {item.entity} · {fmtTimeAgo(item.at)}
                    </div>
                  </div>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;

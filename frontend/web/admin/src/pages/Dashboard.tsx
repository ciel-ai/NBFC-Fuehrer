import React, { useMemo } from 'react';
import { Avatar, Button, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowRightOutlined, BankOutlined, CalendarOutlined, CheckCircleOutlined,
  FileTextOutlined, PhoneOutlined, SafetyCertificateOutlined, ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { ROLE_META, scopedLoanType, LOAN_TYPE_META } from '../auth/rbac';
import ChartCard, { tooltipStyle, tooltipItemStyle, tooltipLabelStyle } from '../components/ChartCard';
import PageHeader from '../components/PageHeader';
import { LoanTypeTag, StatusTag } from '../components/StatusTag';
import { CHART_COLORS } from '../theme';
import { fmtTimeAgo, inr, inrCompact, initials } from '../utils/format';
import { approvalStats, collectionPerformance, monthlyDisbursement, recoveryThisMonth } from '../utils/analytics';
import type { LoanApplication } from '../types';

const isToday = (iso?: string): boolean => !!iso && dayjs(iso).isSame(dayjs(), 'day');

interface Metric { label: string; value: React.ReactNode; sub?: React.ReactNode; to: string; danger?: boolean }
interface ActionItem { icon: React.ReactNode; title: string; sub: string; to: string; tone: string }

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const auditLogs = useAppStore((s) => s.auditLogs);
  const repayments = useAppStore((s) => s.repayments);

  const scope = scopedLoanType(user.role);
  const meta = ROLE_META[user.role];

  const apps = useMemo(() => applications.filter((a) => !scope || a.loanType === scope), [applications, scope]);
  const lns = useMemo(() => loans.filter((l) => !scope || l.loanType === scope), [loans, scope]);

  const counts = useMemo(() => {
    const c = (s: string[]): number => apps.filter((a) => s.includes(a.status)).length;
    const approvedToday = apps.filter((a) => a.creditDecision?.decision === 'APPROVED' && isToday(a.creditDecision.decidedAt)).length;
    const rejectedToday = apps.filter((a) => a.creditDecision?.decision === 'REJECTED' && isToday(a.creditDecision.decidedAt)).length;
    const disbursedToday = apps.filter((a) => isToday(a.finance?.disbursement?.date));
    const dueToday = lns.filter((l) => l.status !== 'CLOSED' && l.nextDueDate === dayjs().format('YYYY-MM-DD'));
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
      disbursedTodayAmt: disbursedToday.reduce((s, a) => s + (a.finance?.disbursement?.amount ?? 0), 0),
      activeLoans: lns.filter((l) => l.status !== 'CLOSED').length,
      collectionDue: dueToday.reduce((s, l) => s + l.emi, 0) + overdueAmt,
      dueTodayCount: dueToday.length,
      overdueAmt,
      npa: lns.filter((l) => l.status === 'NPA').length,
      npaOutstanding: lns.filter((l) => l.status === 'NPA').reduce((s, l) => s + l.outstandingPrincipal, 0),
      recovered: recoveryThisMonth(repayments.filter((r) => !scope || r.loanType === scope)),
      bookSize: lns.filter((l) => l.status !== 'CLOSED').reduce((s, l) => s + l.outstandingPrincipal, 0),
    };
  }, [apps, lns, repayments, scope]);

  const approval = useMemo(() => approvalStats(apps), [apps]);
  const disbTrend = useMemo(() => monthlyDisbursement(lns), [lns]);
  const collPerf = useMemo(() => collectionPerformance(lns), [lns]);
  const recentApps = useMemo(() => apps.slice(0, 7), [apps]);
  const activities = useMemo(() => auditLogs.slice(0, 7), [auditLogs]);

  // ── role-aware metric band ──
  const metrics = useMemo<Metric[]>(() => {
    if (user.role === 'ADMIN') {
      return [
        { label: 'Open Applications', value: counts.total - counts.disbursedToday, sub: `${counts.submitted} new today`, to: '/applications' },
        { label: 'Credit Queue', value: counts.creditPending, sub: 'awaiting underwriting', to: '/applications/credit-pending' },
        { label: 'Finance Queue', value: counts.financePending, sub: `${counts.emandatePending} at e-mandate`, to: '/applications/finance-pending' },
        { label: 'Disbursed Today', value: inrCompact(counts.disbursedTodayAmt), sub: `${counts.disbursedToday} loans`, to: '/finance/disbursed' },
        { label: 'Live Book', value: inrCompact(counts.bookSize), sub: `${counts.activeLoans} active loans`, to: '/lms/accounts' },
        { label: 'NPA', value: counts.npa, sub: `${inrCompact(counts.npaOutstanding)} at risk`, to: '/collections/npa', danger: counts.npa > 0 },
      ];
    }
    if (meta.family === 'CREDIT') {
      return [
        { label: 'Pending Reviews', value: counts.creditPending, sub: `${counts.submitted} just submitted`, to: '/credit/pending' },
        { label: 'Approved Today', value: counts.approvedToday, sub: 'moved to finance', to: '/credit/approved' },
        { label: 'Rejected Today', value: counts.rejectedToday, sub: 'policy declines', to: '/credit/rejected' },
        { label: 'Returned', value: counts.returned, sub: 'sent back to sales', to: '/credit/returned' },
        { label: 'Approval Ratio', value: `${approval.ratio}%`, sub: 'on completed reviews', to: '/credit/approved' },
      ];
    }
    return [
      { label: 'Pending Disbursement', value: counts.financePending, sub: 'approved by credit', to: '/finance/pending' },
      { label: 'E-Mandate Pending', value: counts.emandatePending, sub: 'NPCI registration', to: '/finance/emandates' },
      { label: 'Disbursed Today', value: inrCompact(counts.disbursedTodayAmt), sub: `${counts.disbursedToday} loans`, to: '/finance/disbursed' },
      { label: 'Live Book', value: inrCompact(counts.bookSize), sub: `${counts.activeLoans} active loans`, to: '/lms/accounts' },
    ];
  }, [user.role, meta.family, counts, approval.ratio]);

  // ── needs-action worklist ──
  const actions = useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [];
    if (meta.family !== 'FINANCE') {
      if (counts.submitted) list.push({ icon: <FileTextOutlined />, title: `${counts.submitted} new application${counts.submitted > 1 ? 's' : ''} awaiting credit pickup`, sub: 'Sourced via the mobile sales app', to: '/applications/submitted', tone: '#2563eb' });
      if (counts.creditPending) list.push({ icon: <SafetyCertificateOutlined />, title: `${counts.creditPending} application${counts.creditPending > 1 ? 's' : ''} in the credit review queue`, sub: 'KYC, bureau & document checks pending', to: meta.family === 'CREDIT' ? '/credit/pending' : '/applications/credit-pending', tone: '#b26a00' });
    }
    if (meta.family !== 'CREDIT') {
      const financeOnly = counts.financePending - counts.emandatePending;
      if (financeOnly > 0) list.push({ icon: <BankOutlined />, title: `${financeOnly} approval${financeOnly > 1 ? 's' : ''} awaiting finance processing`, sub: 'Verify fees, bank details & penny-drop', to: meta.family === 'FINANCE' ? '/finance/pending' : '/applications/finance-pending', tone: '#3949ab' });
      if (counts.emandatePending) list.push({ icon: <ThunderboltOutlined />, title: `${counts.emandatePending} e-mandate${counts.emandatePending > 1 ? 's' : ''} in NACH registration`, sub: 'Awaiting NPCI authentication', to: meta.family === 'FINANCE' ? '/finance/emandates' : '/applications', tone: '#0e7490' });
    }
    if (user.role === 'ADMIN') {
      if (counts.dueTodayCount) list.push({ icon: <PhoneOutlined />, title: `${counts.dueTodayCount} EMI${counts.dueTodayCount > 1 ? 's' : ''} due for collection today`, sub: `${inr(counts.collectionDue)} collectible incl. overdue`, to: '/collections/due-today', tone: '#1d7a46' });
      if (counts.npa) list.push({ icon: <WarningOutlined />, title: `${counts.npa} NPA account${counts.npa > 1 ? 's' : ''} under recovery`, sub: `${inrCompact(counts.npaOutstanding)} outstanding`, to: '/collections/npa', tone: '#c0392b' });
    }
    return list;
  }, [counts, meta.family, user.role]);

  // ── portfolio / summary panel ──
  const summary = useMemo<{ label: string; value: React.ReactNode }[]>(() => {
    if (user.role === 'ADMIN') {
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
  }, [user.role, meta.family, counts, approval.ratio]);

  const cols: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application',
      dataIndex: 'appNumber',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 12.5, color: '#2563eb' }}>{v}</div>
          <div style={{ fontSize: 12, color: '#5a6675' }}>{r.customer.name}</div>
        </div>
      ),
    },
    { title: 'Product', dataIndex: 'loanType', width: 130, render: (t) => <LoanTypeTag type={t} full /> },
    { title: 'Amount', dataIndex: ['loan', 'amount'], align: 'right' as const, width: 130, render: (v: number) => <span className="tnum" style={{ fontWeight: 700, color: '#10202f' }}>{inr(v)}</span> },
    { title: 'Stage', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
    { title: 'Age', dataIndex: 'createdAt', width: 110, render: (v: string) => <span style={{ color: '#5a6675', fontSize: 12.5 }}>{fmtTimeAgo(v)}</span> },
  ];

  const pageTitle = user.role === 'ADMIN' ? 'Operations Dashboard' : meta.family === 'CREDIT' ? 'Credit Workbench' : 'Finance Operations';
  const needAction = actions.length;
  const subtitle =
    needAction > 0
      ? `${needAction} item${needAction > 1 ? 's' : ''} need your attention${user.role === 'ADMIN' ? ` · ${inrCompact(counts.collectionDue)} collectible today` : ''}`
      : 'You are all caught up — nothing needs action right now';

  const showCharts = user.role === 'ADMIN' || meta.family === 'FINANCE';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={subtitle}
        extra={
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid #e1e6ee', background: '#fff', color: '#3d4a59', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <CalendarOutlined style={{ color: '#94a3b8' }} />
            {dayjs().format('ddd, DD MMM YYYY')}
          </div>
        }
      />

      {/* dense metric band */}
      <div className="metric-band">
        {metrics.map((m) => (
          <div key={m.label} className="metric-cell" onClick={() => navigate(m.to)}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={m.danger ? { color: '#c0392b' } : undefined}>{m.value}</div>
            {m.sub && <div className="metric-sub">{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* action center + portfolio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.9fr) minmax(0, 1fr)', gap: 16, marginTop: 16, alignItems: 'start' }}>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">
              Needs Action
              <span className={`count-chip${needAction === 0 ? ' count-chip--muted' : ''}`}>{needAction}</span>
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>live</span>
          </div>
          {needAction === 0 ? (
            <div style={{ padding: '34px 18px', textAlign: 'center', color: '#7c8896' }}>
              <CheckCircleOutlined style={{ fontSize: 26, color: '#1d7a46' }} />
              <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 600, color: '#1d2733' }}>All clear</div>
              <div style={{ fontSize: 12.5, marginTop: 3 }}>No applications or accounts are waiting on you.</div>
            </div>
          ) : (
            actions.map((a) => (
              <div key={a.title} className="action-row" onClick={() => navigate(a.to)}>
                <div className="action-ico" style={{ background: `${a.tone}14`, color: a.tone }}>{a.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="action-title">{a.title}</div>
                  <div className="action-sub">{a.sub}</div>
                </div>
                <ArrowRightOutlined style={{ color: '#b6c2d6', fontSize: 13 }} />
              </div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">{user.role === 'ADMIN' ? 'Portfolio' : 'Summary'}</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{scope ? LOAN_TYPE_META[scope].short : 'all products'}</span>
          </div>
          {summary.map((s) => (
            <div key={s.label} className="stat-row">
              <span className="stat-label">{s.label}</span>
              <span className="stat-val">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* operational table */}
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <span className="panel-title">Recent Applications</span>
          <Button type="link" size="small" style={{ fontWeight: 600 }} onClick={() => navigate('/applications')}>
            View all <ArrowRightOutlined style={{ fontSize: 11 }} />
          </Button>
        </div>
        <Table<LoanApplication>
          dataSource={recentApps}
          columns={cols}
          rowKey="id"
          size="middle"
          pagination={false}
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
        />
      </div>

      {/* supporting trends + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: user.role === 'ADMIN' ? 'minmax(0, 1.9fr) minmax(0, 1fr)' : '1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
        {showCharts && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title="Disbursement" subtitle="Monthly principal — last 6 months" height={210}>
              <ResponsiveContainer>
                <BarChart data={disbTrend} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7c8896' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => inrCompact(v)} tick={{ fontSize: 11, fill: '#7c8896' }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => inr(Number(v))} />
                  <Bar dataKey="amount" name="Disbursed" fill={CHART_COLORS.CDL} radius={[5, 5, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Collections" subtitle="Demand vs collected" height={210}>
              <ResponsiveContainer>
                <BarChart data={collPerf} margin={{ top: 6, right: 8, left: -8, bottom: 0 }} barGap={3}>
                  <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7c8896' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v: number) => inrCompact(v)} tick={{ fontSize: 11, fill: '#7c8896' }} axisLine={false} tickLine={false} width={58} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => inr(Number(v))} />
                  <Bar dataKey="due" name="Demand" fill="#cdd9f3" radius={[5, 5, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="collected" name="Collected" fill={CHART_COLORS.green} radius={[5, 5, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {user.role === 'ADMIN' && (
          <div className="panel">
            <div className="panel-head">
              <span className="panel-title">Recent Activity</span>
              <Button type="link" size="small" style={{ fontWeight: 600 }} onClick={() => navigate('/audit')}>Audit log</Button>
            </div>
            <div style={{ padding: '4px 0' }}>
              {activities.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '9px 18px' }}>
                  <Avatar size={30} style={{ background: '#eaf1fe', color: '#2563eb', fontWeight: 700, fontSize: 11, minWidth: 30 }}>
                    {initials(item.user)}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1d2733', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.action}</div>
                    <div style={{ fontSize: 11.5, color: '#8a97a6' }}>{item.user} · {item.entity} · {fmtTimeAgo(item.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

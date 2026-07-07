import React, { useMemo, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Result, Row, Segmented, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { ROLE_META, scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import ChartCard, { tooltipStyle, tooltipItemStyle, tooltipLabelStyle } from '../../components/ChartCard';
import { CHART_COLORS } from '../../theme';
import { exportCsv } from '../../utils/csv';
import { fmtDate, inr, inrCompact, pct } from '../../utils/format';
import {
  approvalStats, collectionPerformance, disbursementModeSplit, dpdBucketDist,
  monthlyDisbursement, riskGradeDist, weeklyAppTrend,
} from '../../utils/analytics';
import type { LoanType } from '../../types';

const { RangePicker } = DatePicker;

type ReportTab = 'los' | 'credit' | 'finance' | 'collections';

const TAB_LABEL: Record<ReportTab, string> = {
  los: 'LOS Reports', credit: 'Credit Reports', finance: 'Finance Reports', collections: 'Collection Reports',
};

const StatStrip: React.FC<{ stats: { label: string; value: React.ReactNode }[] }> = ({ stats }) => (
  <Card variant="borderless" style={{ border: '1px solid #e7ebf3', marginBottom: 16 }} styles={{ body: { padding: '16px 22px' } }}>
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      {stats.map((s) => (
        <div key={s.label}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 5 }}>{s.label}</div>
          <div className="tnum" style={{ fontSize: 21, fontWeight: 700, color: '#0f172a' }}>{s.value}</div>
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
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);
  const scope = scopedLoanType(user.role);
  const family = ROLE_META[user.role].family;

  const allowedTabs: ReportTab[] =
    user.role === 'ADMIN' ? ['los', 'credit', 'finance', 'collections']
    : family === 'CREDIT' ? ['credit'] : ['finance'];
  const activeTab = (allowedTabs.includes(tab as ReportTab) ? tab : allowedTabs[0]) as ReportTab;

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>([dayjs().subtract(90, 'day'), dayjs()]);
  const [typeFilter, setTypeFilter] = useState<LoanType | undefined>();

  const effType = scope ?? typeFilter;

  const apps = useMemo(() => applications.filter((a) => {
    if (effType && a.loanType !== effType) return false;
    if (range?.[0] && dayjs(a.createdAt).isBefore(range[0].startOf('day'))) return false;
    if (range?.[1] && dayjs(a.createdAt).isAfter(range[1].endOf('day'))) return false;
    return true;
  }), [applications, effType, range]);

  const lns = useMemo(() => loans.filter((l) => !effType || l.loanType === effType), [loans, effType]);

  if (!allowedTabs.includes(tab as ReportTab)) {
    return <Result status="403" title="Report not available for your role" extra={<Button type="primary" onClick={() => navigate(`/reports/${allowedTabs[0]}`)}>Go to {TAB_LABEL[allowedTabs[0]!]}</Button>} />;
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
    ? (decided.reduce((s, a) => s + Math.max(0.2, dayjs(a.creditDecision!.decidedAt).diff(dayjs(a.createdAt), 'day', true)), 0) / decided.length)
    : 0;
  const avgBureau = apps.length ? Math.round(apps.reduce((s, a) => s + a.bureau.score, 0) / apps.length) : 0;

  const disbursedApps = apps.filter((a) => a.finance?.disbursement);
  const feesCollected = disbursedApps.reduce((s, a) => s + (a.finance ? a.finance.fees.processingFee + a.finance.fees.gst : 0), 0);

  const totalDemand = collPerf.reduce((s, m) => s + m.due, 0);
  const totalCollected = collPerf.reduce((s, m) => s + m.collected, 0);
  const npaLoans = lns.filter((l) => l.status === 'NPA');
  const openBook = lns.filter((l) => l.status !== 'CLOSED').reduce((s, l) => s + l.outstandingPrincipal, 0);

  // rejection reasons
  const rejReasons = useMemo(() => {
    const map = new Map<string, number>();
    apps.filter((a) => a.creditDecision?.decision === 'REJECTED').forEach((a) => {
      const r = a.creditDecision!.reason ?? 'Other';
      map.set(r, (map.get(r) ?? 0) + 1);
    });
    return [...map.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [apps]);

  // branch summary (LOS)
  const branchSummary = useMemo(() => {
    const map = new Map<string, { branch: string; count: number; amount: number; disbursed: number }>();
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
      exportCsv(`los-report-${dayjs().format('YYYYMMDD')}`, ['Branch', 'Applications', 'Requested Amount', 'Disbursed Count'],
        branchSummary.map((b) => [b.branch, b.count, b.amount, b.disbursed]));
    } else if (activeTab === 'credit') {
      exportCsv(`credit-report-${dayjs().format('YYYYMMDD')}`, ['Application', 'Customer', 'Type', 'Bureau', 'Grade', 'Decision', 'Reason', 'Decided At'],
        decided.map((a) => [a.appNumber, a.customer.name, a.loanType, a.bureau.score, a.creditDecision!.riskGrade, a.creditDecision!.decision, a.creditDecision!.reason ?? '', fmtDate(a.creditDecision!.decidedAt)]));
    } else if (activeTab === 'finance') {
      exportCsv(`finance-report-${dayjs().format('YYYYMMDD')}`, ['Application', 'Customer', 'Type', 'Sanctioned', 'Net Disbursed', 'Mode', 'UTR', 'Date'],
        disbursedApps.map((a) => [a.appNumber, a.customer.name, a.loanType, a.creditDecision?.approvedAmount ?? a.loan.amount, a.finance!.disbursement!.amount, a.finance!.disbursement!.mode, a.finance!.disbursement!.utr, fmtDate(a.finance!.disbursement!.date)]));
    } else {
      exportCsv(`collections-report-${dayjs().format('YYYYMMDD')}`, ['Bucket', 'Accounts', 'Outstanding'],
        buckets.map((b) => [b.bucket, b.count, b.outstanding]));
    }
  };

  const branchCols: TableProps<(typeof branchSummary)[number]>['columns'] = [
    { title: 'Branch', dataIndex: 'branch', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Applications', dataIndex: 'count', align: 'right', sorter: (a, b) => a.count - b.count },
    { title: 'Requested Amount', dataIndex: 'amount', align: 'right', render: (v: number) => <span className="tnum">{inr(v)}</span> },
    { title: 'Disbursed', dataIndex: 'disbursed', align: 'right' },
    { title: 'Conversion', key: 'conv', align: 'right', render: (_, r) => <span className="tnum" style={{ fontWeight: 600 }}>{pct(r.count ? (r.disbursed / r.count) * 100 : 0, 0)}</span> },
  ];

  return (
    <div className="print-area">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Regulatory-grade MIS across origination, credit, finance and collections"
        extra={
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <Button icon={<FilePdfOutlined />} onClick={() => { message.info('Preparing print-ready PDF…'); setTimeout(() => window.print(), 300); }}>PDF</Button>
            <Button icon={<FileExcelOutlined />} onClick={exportReport}>Excel</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={exportReport}>CSV</Button>
          </div>
        }
      />

      <Card variant="borderless" className="no-print" style={{ border: '1px solid #e7ebf3', marginBottom: 16 }} styles={{ body: { padding: '14px 18px' } }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Segmented
            value={activeTab}
            onChange={(v) => navigate(`/reports/${v}`)}
            options={allowedTabs.map((t) => ({ value: t, label: TAB_LABEL[t] }))}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!scope && (
              <Select
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
            <RangePicker value={range as any} onChange={(v) => setRange(v as any)} style={{ width: 260 }} />
          </div>
        </div>
      </Card>

      {/* ════ LOS ════ */}
      {activeTab === 'los' && (
        <>
          <StatStrip stats={[
            { label: 'Applications', value: apps.length },
            { label: 'Requested Value', value: inrCompact(apps.reduce((s, a) => s + a.loan.amount, 0)) },
            { label: 'Approval Ratio', value: `${approval.ratio}%` },
            { label: 'Converted to Loans', value: disbursedApps.length },
            { label: 'Avg Ticket Size', value: apps.length ? inrCompact(apps.reduce((s, a) => s + a.loan.amount, 0) / apps.length) : '—' },
          ]} />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard title="Application Trends" subtitle="Weekly intake by product" height={270}>
                <ResponsiveContainer>
                  <AreaChart data={trend} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS.CDL} strokeWidth={2.4} fill={CHART_COLORS.CDL + '18'} />
                    <Area type="monotone" dataKey="GOLD" name="Gold" stroke={CHART_COLORS.GOLD} strokeWidth={1.6} fill="transparent" />
                    <Area type="monotone" dataKey="HOUSING" name="Housing" stroke={CHART_COLORS.HOUSING} strokeWidth={1.6} fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard title="Sourcing Channels" subtitle="Application share by origin" height={270}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={sourceSplit} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} strokeWidth={0}>
                      {sourceSplit.map((s, i) => <Cell key={s.name} fill={[CHART_COLORS.CDL, CHART_COLORS.green, CHART_COLORS.GOLD, CHART_COLORS.HOUSING][i % 4]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Branch-wise Performance</span>}>
                <Table dataSource={branchSummary} columns={branchCols} rowKey="branch" size="small" pagination={false} />
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ════ CREDIT ════ */}
      {activeTab === 'credit' && (
        <>
          <StatStrip stats={[
            { label: 'Decisions Made', value: decided.length },
            { label: 'Approval Rate', value: `${approval.ratio}%` },
            { label: 'Avg Decision TAT', value: `${avgTat.toFixed(1)} days` },
            { label: 'Avg Bureau Score', value: avgBureau },
            { label: 'Returned for Rework', value: approval.returned },
          ]} />
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
                      dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} strokeWidth={0}
                    >
                      <Cell fill={CHART_COLORS.green} />
                      <Cell fill={CHART_COLORS.red} />
                      <Cell fill="#9333ea" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} md={8}>
              <ChartCard title="Risk Grade Distribution" subtitle="Underwriting grades assigned" height={260}>
                <ResponsiveContainer>
                  <BarChart data={grades} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]} maxBarSize={34}>
                      {grades.map((g, i) => <Cell key={g.grade} fill={['#16a34a', '#65a30d', '#d97706', '#dc2626'][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} md={8}>
              <ChartCard title="Rejection Reasons" subtitle="Top decline drivers" height={260}>
                <ResponsiveContainer>
                  <BarChart data={rejReasons} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 10.5, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Bar dataKey="count" name="Declines" fill={CHART_COLORS.red} radius={[0, 6, 6, 0]} maxBarSize={18} />
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
          <StatStrip stats={[
            { label: 'Loans Disbursed', value: disbursedApps.length },
            { label: 'Amount Disbursed', value: inrCompact(disbursedApps.reduce((s, a) => s + a.finance!.disbursement!.amount, 0)) },
            { label: 'Fees + GST Collected', value: inrCompact(feesCollected) },
            { label: 'Avg Ticket', value: disbursedApps.length ? inrCompact(disbursedApps.reduce((s, a) => s + a.finance!.disbursement!.amount, 0) / disbursedApps.length) : '—' },
          ]} />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard title="Disbursement Trends" subtitle="Monthly disbursed principal" height={270}>
                <ResponsiveContainer>
                  <BarChart data={disb} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => inrCompact(v)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={62} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => inr(Number(v))} />
                    <Bar dataKey="amount" name="Disbursed" fill={CHART_COLORS.CDL} radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard title="Payout Modes" subtitle="NEFT / RTGS / IMPS split" height={270}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={modes} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} strokeWidth={0}>
                      {modes.map((m, i) => <Cell key={m.name} fill={[CHART_COLORS.CDL, CHART_COLORS.cyan, CHART_COLORS.green][i % 3]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Recent Disbursements</span>}>
                <Table
                  dataSource={disbursedApps.slice(0, 8)}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Application', dataIndex: 'appNumber', render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
                    { title: 'Customer', render: (_: unknown, r: any) => r.customer.name },
                    { title: 'Net Disbursed', align: 'right' as const, render: (_: unknown, r: any) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(r.finance.disbursement.amount)}</span> },
                    { title: 'Mode', render: (_: unknown, r: any) => r.finance.disbursement.mode },
                    { title: 'UTR', render: (_: unknown, r: any) => <span className="tnum" style={{ fontSize: 12, color: '#64748b' }}>{r.finance.disbursement.utr}</span> },
                    { title: 'Date', render: (_: unknown, r: any) => fmtDate(r.finance.disbursement.date) },
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
          <StatStrip stats={[
            { label: 'Demand (6m)', value: inrCompact(totalDemand) },
            { label: 'Collected (6m)', value: inrCompact(totalCollected) },
            { label: 'Collection Efficiency', value: `${totalDemand ? Math.round((totalCollected / totalDemand) * 100) : 100}%` },
            { label: 'NPA Accounts', value: npaLoans.length },
            { label: 'GNPA %', value: openBook ? pct((npaLoans.reduce((s, l) => s + l.outstandingPrincipal, 0) / openBook) * 100) : '0%' },
            { label: 'Recovery Receipts', value: repayments.filter((r) => r.type === 'RECOVERY').length },
          ]} />
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <ChartCard title="Recovery Performance" subtitle="Collection efficiency % by month" height={270}>
                <ResponsiveContainer>
                  <LineChart data={collPerf} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke={CHART_COLORS.green} strokeWidth={2.6} dot={{ r: 4, fill: CHART_COLORS.green }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col xs={24} xl={10}>
              <ChartCard title="Delinquency Buckets" subtitle="Open accounts by DPD band" height={270}>
                <ResponsiveContainer>
                  <BarChart data={buckets} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                    <Bar dataKey="count" name="Accounts" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {buckets.map((b, i) => <Cell key={b.bucket} fill={['#16a34a', '#d97706', '#ea580c', '#dc2626', '#991b1b'][i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Col>
            <Col span={24}>
              <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Bucket Summary</span>}>
                <Table
                  dataSource={buckets}
                  rowKey="bucket"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'DPD Bucket', dataIndex: 'bucket', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
                    { title: 'Accounts', dataIndex: 'count', align: 'right' as const },
                    { title: 'Outstanding', dataIndex: 'outstanding', align: 'right' as const, render: (v: number) => <span className="tnum">{inr(v)}</span> },
                    { title: 'Share of Book', key: 'share', align: 'right' as const, render: (_: unknown, r: any) => <span className="tnum" style={{ fontWeight: 600 }}>{openBook ? pct((r.outstanding / openBook) * 100) : '0%'}</span> },
                  ]}
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

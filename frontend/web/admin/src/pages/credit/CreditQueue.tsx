import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Segmented, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined, EyeOutlined,
  RollbackOutlined, SafetyCertificateOutlined, SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, RiskGradeTag, StatusTag, scoreColor } from '../../components/StatusTag';
import CreditDecisionDrawer from '../applications/CreditDecisionDrawer';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import type { LoanApplication } from '../../types';

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
  const activeTab = (['pending', 'approved', 'rejected', 'returned'].includes(tab) ? tab : 'pending') as CreditTab;
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const scope = scopedLoanType(user.role);

  const [search, setSearch] = useState('');
  const [decisionApp, setDecisionApp] = useState<LoanApplication | null>(null);

  const scoped = useMemo(() => applications.filter((a) => !scope || a.loanType === scope), [applications, scope]);

  const buckets = useMemo(() => ({
    pending: scoped.filter((a) => a.status === 'CREDIT_PENDING'),
    approved: scoped.filter((a) => a.creditDecision?.decision === 'APPROVED'),
    rejected: scoped.filter((a) => a.status === 'CREDIT_REJECTED'),
    returned: scoped.filter((a) => a.status === 'CREDIT_RETURNED'),
  }), [scoped]);

  const isToday = (iso?: string): boolean => !!iso && dayjs(iso).isSame(dayjs(), 'day');
  const approvedToday = buckets.approved.filter((a) => isToday(a.creditDecision?.decidedAt)).length;
  const rejectedToday = buckets.rejected.filter((a) => isToday(a.creditDecision?.decidedAt)).length;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buckets[activeTab].filter((a) =>
      !q || `${a.appNumber} ${a.customer.name} ${a.customer.mobile}`.toLowerCase().includes(q),
    );
  }, [buckets, activeTab, search]);

  const baseCols: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application',
      dataIndex: 'appNumber',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#2563eb', fontSize: 12.5 }}>{v}</div>
          <div style={{ fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{r.customer.name}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>+91 {r.customer.mobile}</div>
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
          <div className="tnum" style={{ fontWeight: 700 }}>{inr(r.loan.amount)}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{r.loan.tenureMonths}m @ {r.loan.interestRate}%</div>
        </div>
      ),
    },
    {
      title: 'Bureau',
      dataIndex: ['bureau', 'score'],
      width: 90,
      align: 'center',
      sorter: (a, b) => a.bureau.score - b.bureau.score,
      render: (v: number) => <span className="tnum" style={{ fontWeight: 700, color: scoreColor(v) }}>{v}</span>,
    },
    {
      title: 'FOIR',
      dataIndex: ['customer', 'income', 'foir'],
      width: 80,
      align: 'center',
      render: (v: number) => <span className="tnum" style={{ fontWeight: 600, color: v <= 55 ? '#475569' : '#dc2626' }}>{v}%</span>,
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
        return <span style={{ fontWeight: 600, color: days > 4 ? '#dc2626' : days > 2 ? '#d97706' : '#475569', fontSize: 12.5 }}>{days === 0 ? 'Today' : `${days}d`}</span>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 200,
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/applications/view/${r.id}`); }}>
            Review
          </Button>
          <Button size="small" type="primary" icon={<SafetyCertificateOutlined />} onClick={(e) => { e.stopPropagation(); setDecisionApp(r); }}>
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
      render: (_, r) => (r.creditDecision ? <RiskGradeTag grade={r.creditDecision.riskGrade} /> : '—'),
    },
    ...(activeTab === 'approved'
      ? [{
          title: 'Sanctioned',
          key: 'sanctioned',
          align: 'right' as const,
          width: 130,
          render: (_: unknown, r: LoanApplication) => <span className="tnum" style={{ fontWeight: 700, color: '#047857' }}>{inr(r.creditDecision?.approvedAmount ?? r.loan.amount)}</span>,
        }]
      : [{
          title: 'Reason',
          key: 'reason',
          width: 220,
          render: (_: unknown, r: LoanApplication) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{r.creditDecision?.reason ?? '—'}</span>,
        }]),
    {
      title: 'Decided',
      key: 'decided',
      width: 170,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12.5, color: '#475569' }}>{fmtDateTime(r.creditDecision?.decidedAt)}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>by {r.creditDecision?.decidedBy}</div>
        </div>
      ),
    },
    { title: 'Status', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Credit Workbench"
        subtitle={scope ? `Underwriting queue — ${scope} portfolio` : 'Underwriting queue across all loan products'}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `credit-${activeTab}-${dayjs().format('YYYYMMDD')}`,
                ['Application', 'Customer', 'Type', 'Amount', 'Bureau', 'FOIR %', 'Status', 'Created'],
                rows.map((a) => [a.appNumber, a.customer.name, a.loanType, a.loan.amount, a.bureau.score, a.customer.income.foir, a.status, fmtDate(a.createdAt)]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Pending Reviews" value={buckets.pending.length} sub="awaiting decision" icon={<SafetyCertificateOutlined />} tint="#d97706" onClick={() => navigate('/credit/pending')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Approved Today" value={approvedToday} sub={`${buckets.approved.length} total approved`} icon={<CheckCircleOutlined />} tint="#16a34a" onClick={() => navigate('/credit/approved')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Rejected Today" value={rejectedToday} sub={`${buckets.rejected.length} total rejected`} icon={<CloseCircleOutlined />} tint="#dc2626" onClick={() => navigate('/credit/rejected')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Returned Applications" value={buckets.returned.length} sub="with sales for rework" icon={<RollbackOutlined />} tint="#7e22ce" onClick={() => navigate('/credit/returned')} /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eef1f7' }}>
          <Segmented
            value={activeTab}
            onChange={(v) => navigate(`/credit/${v}`)}
            options={(['pending', 'approved', 'rejected', 'returned'] as CreditTab[]).map((t) => ({
              value: t,
              label: `${TAB_TITLES[t]} (${buckets[t].length})`,
            }))}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search application, customer…"
            allowClear
            style={{ width: 280, marginLeft: 'auto' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Table<LoanApplication>
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
        <Card variant="borderless" style={{ border: '1px dashed #dbe4f5', marginTop: 16, background: '#fbfcff' }} styles={{ body: { padding: '14px 20px' } }}>
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            <ThunderboltOutlined style={{ color: '#d97706', marginRight: 8 }} />
            <strong>Credit workflow:</strong> Open application → verify documents → verify KYC → check bureau report → risk assessment → Approve / Reject / Send Back. Decisions are final and logged to the audit trail.
          </span>
        </Card>
      )}

      {decisionApp && (
        <CreditDecisionDrawer app={decisionApp} open={!!decisionApp} onClose={() => setDecisionApp(null)} />
      )}
    </div>
  );
};

export default CreditQueue;

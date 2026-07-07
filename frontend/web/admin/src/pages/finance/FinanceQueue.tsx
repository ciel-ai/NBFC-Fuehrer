import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Segmented, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  BankOutlined, DownloadOutlined, FundOutlined, RightCircleOutlined,
  SearchOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr, inrCompact, maskAccount } from '../../utils/format';
import type { LoanApplication } from '../../types';

type FinanceTab = 'pending' | 'emandates' | 'disbursed';

const FinanceQueue: React.FC = () => {
  const navigate = useNavigate();
  const { tab = 'pending' } = useParams<{ tab: FinanceTab }>();
  const activeTab = (['pending', 'emandates', 'disbursed'].includes(tab) ? tab : 'pending') as FinanceTab;
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const scope = scopedLoanType(user.role);
  const [search, setSearch] = useState('');

  const scoped = useMemo(() => applications.filter((a) => !scope || a.loanType === scope), [applications, scope]);

  const buckets = useMemo(() => ({
    pending: scoped.filter((a) => ['CREDIT_APPROVED', 'FINANCE_PENDING'].includes(a.status)),
    emandates: scoped.filter((a) => a.status === 'EMANDATE_PENDING'),
    disbursed: scoped.filter((a) => ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(a.status) && a.finance?.disbursement),
  }), [scoped]);

  const disbursedToday = buckets.disbursed.filter((a) => dayjs(a.finance!.disbursement!.date).isSame(dayjs(), 'day'));

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
          <div style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</div>
          <div style={{ fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{r.customer.name}</div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'loanType', width: 95, render: (t) => <LoanTypeTag type={t} /> },
    {
      title: 'Sanctioned',
      key: 'sanctioned',
      align: 'right',
      width: 140,
      sorter: (a, b) => (a.creditDecision?.approvedAmount ?? a.loan.amount) - (b.creditDecision?.approvedAmount ?? b.loan.amount),
      render: (_, r) => <span className="tnum" style={{ fontWeight: 700 }}>{inr(r.creditDecision?.approvedAmount ?? r.loan.amount)}</span>,
    },
  ];

  const pendingCols: TableProps<LoanApplication>['columns'] = [
    ...baseCols,
    {
      title: 'Net Payout',
      key: 'net',
      align: 'right',
      width: 140,
      render: (_, r) => r.finance
        ? <span className="tnum" style={{ fontWeight: 600, color: '#0f766e' }}>{inr(r.finance.netDisbursement)}</span>
        : <span style={{ color: '#94a3b8', fontSize: 12 }}>on verification</span>,
    },
    {
      title: 'Beneficiary Bank',
      key: 'bank',
      width: 210,
      render: (_, r) => r.finance
        ? <span style={{ fontSize: 12.5, color: '#475569' }}>{r.finance.bank.bankName} · <span className="tnum">{maskAccount(r.finance.bank.accountNumber)}</span></span>
        : <span style={{ color: '#94a3b8', fontSize: 12 }}>pending verification</span>,
    },
    { title: 'Status', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Action',
      key: 'action',
      width: 130,
      render: (_, r) => (
        <Button size="small" type="primary" icon={<RightCircleOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/applications/view/${r.id}`); }}>
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
      render: (_, r) => <span style={{ fontSize: 12.5, color: '#475569' }}>{r.finance?.emandate.bank ?? r.finance?.bank.bankName}</span>,
    },
    {
      title: 'Debit Cap',
      key: 'cap',
      align: 'right',
      width: 110,
      render: (_, r) => <span className="tnum">{r.finance?.emandate.maxAmount ? inr(r.finance.emandate.maxAmount) : '—'}</span>,
    },
    {
      title: 'UMRN',
      key: 'umrn',
      width: 190,
      render: (_, r) => <span className="tnum" style={{ fontSize: 12 }}>{r.finance?.emandate.umrn ?? <span style={{ color: '#94a3b8' }}>awaiting NPCI</span>}</span>,
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
        <Button size="small" type="primary" icon={<RightCircleOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/applications/view/${r.id}`); }}>
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
      render: (_, r) => <span className="tnum" style={{ fontWeight: 600, color: '#0f766e' }}>{inr(r.finance!.disbursement!.amount)}</span>,
    },
    { title: 'Mode / UTR', key: 'utr', width: 230, render: (_, r) => <span style={{ fontSize: 12, color: '#475569' }}>{r.finance!.disbursement!.mode} · <span className="tnum">{r.finance!.disbursement!.utr}</span></span> },
    { title: 'Disbursed On', key: 'date', width: 175, sorter: (a, b) => dayjs(a.finance!.disbursement!.date).valueOf() - dayjs(b.finance!.disbursement!.date).valueOf(), defaultSortOrder: 'descend', render: (_, r) => <span style={{ fontSize: 12.5, color: '#475569' }}>{fmtDateTime(r.finance!.disbursement!.date)}</span> },
    {
      title: 'Loan Account',
      dataIndex: 'loanNumber',
      width: 170,
      render: (v: string) => v ? (
        <Button size="small" type="link" style={{ padding: 0, fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); navigate(`/lms/accounts/${v}`); }}>
          {v}
        </Button>
      ) : '—',
    },
  ];

  const cols = activeTab === 'pending' ? pendingCols : activeTab === 'emandates' ? emandateCols : disbursedCols;

  return (
    <div>
      <PageHeader
        title="Finance Operations"
        subtitle={scope ? `Disbursement desk — ${scope} portfolio` : 'Disbursement desk across all loan products'}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `finance-${activeTab}-${dayjs().format('YYYYMMDD')}`,
                ['Application', 'Customer', 'Type', 'Sanctioned', 'Status', 'Created'],
                rows.map((a) => [a.appNumber, a.customer.name, a.loanType, a.creditDecision?.approvedAmount ?? a.loan.amount, a.status, fmtDate(a.createdAt)]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Pending Disbursement" value={buckets.pending.length} sub={inrCompact(buckets.pending.reduce((s, a) => s + (a.creditDecision?.approvedAmount ?? a.loan.amount), 0)) + ' sanctioned'} icon={<BankOutlined />} tint="#0369a1" onClick={() => navigate('/finance/pending')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="E-Mandate Pending" value={buckets.emandates.length} sub={`${buckets.emandates.filter((a) => a.finance?.emandate.status === 'ACTIVE').length} ready to disburse`} icon={<ThunderboltOutlined />} tint="#0e7490" onClick={() => navigate('/finance/emandates')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Disbursed Today" value={disbursedToday.length} sub={inrCompact(disbursedToday.reduce((s, a) => s + a.finance!.disbursement!.amount, 0)) + ' credited'} icon={<FundOutlined />} tint="#0f766e" onClick={() => navigate('/finance/disbursed')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Total Disbursed" value={buckets.disbursed.length} sub="lifetime conversions" icon={<FundOutlined />} tint="#7c3aed" /></Col>
      </Row>

      <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eef1f7' }}>
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
          columns={cols}
          rowKey="id"
          size="middle"
          className="row-link"
          scroll={{ x: 1020 }}
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} applications` }}
        />
      </Card>

      <Card variant="borderless" style={{ border: '1px dashed #dbe4f5', marginTop: 16, background: '#fbfcff' }} styles={{ body: { padding: '14px 20px' } }}>
        <span style={{ fontSize: 12.5, color: '#64748b' }}>
          <ThunderboltOutlined style={{ color: '#0e7490', marginRight: 8 }} />
          <strong>Finance workflow:</strong> Verify approved amount &amp; bank account → setup NACH e-mandate → disburse.
          Status flows FINANCE_PENDING → EMANDATE_PENDING → DISBURSED; a loan account is created in the LMS on disbursal.
        </span>
      </Card>
    </div>
  );
};

export default FinanceQueue;

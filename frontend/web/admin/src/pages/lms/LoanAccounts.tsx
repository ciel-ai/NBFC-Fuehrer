import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  DownloadOutlined, EyeOutlined, SearchOutlined, WalletOutlined,
  WarningOutlined, CheckCircleOutlined, FundOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLoanBook } from '../../hooks/useLms';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, StatusTag, dpdColor } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, inr, inrCompact } from '../../utils/format';
import type { LoanAccount, LoanStatus, LoanType } from '../../types';

const LoanAccounts: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { loans, live, loading } = useLoanBook();
  const scope = scopedLoanType(user.role);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LoanType | undefined>();
  const [statusFilter, setStatusFilter] = useState<LoanStatus | undefined>();

  const scoped = useMemo(() => loans.filter((l) => !scope || l.loanType === scope), [loans, scope]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((l) => {
      if (typeFilter && l.loanType !== typeFilter) return false;
      if (statusFilter && l.status !== statusFilter) return false;
      if (q && !`${l.loanNumber} ${l.customerName} ${l.mobile} ${l.appNumber}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [scoped, search, typeFilter, statusFilter]);

  const open = scoped.filter((l) => l.status !== 'CLOSED');
  const bookSize = open.reduce((s, l) => s + l.outstandingPrincipal, 0);
  const npaCount = scoped.filter((l) => l.status === 'NPA').length;
  const overdueCount = scoped.filter((l) => l.status === 'OVERDUE').length;

  const columns: TableProps<LoanAccount>['columns'] = [
    {
      title: 'Loan Number',
      dataIndex: 'loanNumber',
      width: 185,
      render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>+91 {r.mobile}</div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t: LoanType) => <LoanTypeTag type={t} /> },
    {
      title: 'Loan Amount',
      dataIndex: 'principal',
      align: 'right',
      width: 125,
      sorter: (a, b) => a.principal - b.principal,
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstandingPrincipal',
      align: 'right',
      width: 125,
      sorter: (a, b) => a.outstandingPrincipal - b.outstandingPrincipal,
      render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span>,
    },
    {
      title: 'EMI',
      dataIndex: 'emi',
      align: 'right',
      width: 105,
      render: (v: number, r) => (
        <div>
          <div className="tnum">{inr(v)}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.paidCount}/{r.tenureMonths} paid</div>
        </div>
      ),
    },
    {
      title: 'DPD',
      dataIndex: 'dpd',
      align: 'center',
      width: 80,
      sorter: (a, b) => a.dpd - b.dpd,
      render: (v: number) => <span className="tnum" style={{ fontWeight: 700, color: dpdColor(v) }}>{v}</span>,
    },
    {
      title: 'Next Due',
      dataIndex: 'nextDueDate',
      width: 110,
      render: (v?: string) => v
        ? <span style={{ fontSize: 12.5, color: v === dayjs().format('YYYY-MM-DD') ? '#d97706' : '#64748b', fontWeight: v === dayjs().format('YYYY-MM-DD') ? 700 : 400 }}>{v === dayjs().format('YYYY-MM-DD') ? 'Today' : fmtDate(v)}</span>
        : '—',
    },
    { title: 'Status', dataIndex: 'status', width: 105, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/lms/accounts/${r.loanNumber}`); }}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Loan Accounts"
        subtitle={`Loan management system · ${scoped.length} accounts ${scope ? `· ${scope} portfolio` : ''}${live ? '' : ' · sample data (live API unreachable)'}`}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `loan-accounts-${dayjs().format('YYYYMMDD')}`,
                ['Loan Number', 'Customer', 'Type', 'Principal', 'Outstanding', 'EMI', 'DPD', 'Status', 'Disbursed On'],
                rows.map((l) => [l.loanNumber, l.customerName, l.loanType, l.principal, l.outstandingPrincipal, l.emi, l.dpd, l.status, fmtDate(l.disbursedOn)]),
              )
            }
          >
            Export CSV
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Active Book" value={open.length} sub="open loan accounts" icon={<WalletOutlined />} tint="#7c3aed" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Book Outstanding" value={inrCompact(bookSize)} sub="principal outstanding" icon={<FundOutlined />} tint="#0284c7" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Overdue Accounts" value={overdueCount} sub="DPD 1–90" icon={<WarningOutlined />} tint="#ea580c" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="NPA Accounts" value={npaCount} sub="DPD 90+" icon={<CheckCircleOutlined />} tint="#dc2626" /></Col>
      </Row>

      <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search loan no, customer, mobile…"
            allowClear
            style={{ width: 290 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!scope && (
            <Select
              placeholder="Loan Type"
              allowClear
              style={{ width: 165 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'CDL', label: 'Consumer Durable' },
                { value: 'GOLD', label: 'Gold Loan' },
                { value: 'HOUSING', label: 'Affordable Housing' },
              ]}
            />
          )}
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={(['ACTIVE', 'OVERDUE', 'NPA', 'CLOSED'] as LoanStatus[]).map((s) => ({ value: s, label: s }))}
          />
        </div>
        <Table<LoanAccount>
          dataSource={rows}
          columns={columns}
          rowKey="loanNumber"
          loading={loading}
          size="middle"
          className="row-link"
          scroll={{ x: 1100 }}
          onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} accounts` }}
        />
      </Card>
    </div>
  );
};

export default LoanAccounts;

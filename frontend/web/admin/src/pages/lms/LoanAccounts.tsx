import React, { useMemo, useState } from 'react';
import { Button, Card, Input, Select } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLoanBook } from '../../hooks/useLms';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { MetricBand } from '../../components/KpiCard';
import { LoanTypeTag, StatusTag, dpdColor } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, inr, inrCompact } from '../../utils/format';
import type { LoanAccount, LoanStatus, LoanType } from '../../types';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';

const LoanAccounts: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { loans, loading, source, error, reload } = useLoanBook();
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
      if (
        q &&
        !`${l.loanNumber} ${l.customerName} ${l.mobile} ${l.appNumber}`.toLowerCase().includes(q)
      )
        return false;
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
      render: (v: string) => <span className="u-semibold u-accent u-sm">{v}</span>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      render: (v: string, r) => (
        <div>
          <div className="u-semibold u-ink-900">{v}</div>
          <div className="u-xs u-ink-400">+91 {r.mobile}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'loanType',
      width: 90,
      render: (t: LoanType) => <LoanTypeTag type={t} />,
    },
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
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'EMI',
      dataIndex: 'emi',
      align: 'right',
      width: 105,
      render: (v: number, r) => (
        <div>
          <div className="tnum">{inr(v)}</div>
          <div className="u-xs u-ink-400">
            {r.paidCount}/{r.tenureMonths} paid
          </div>
        </div>
      ),
    },
    {
      title: 'DPD',
      dataIndex: 'dpd',
      align: 'center',
      width: 80,
      sorter: (a, b) => a.dpd - b.dpd,
      render: (v: number) => (
        <span className="tnum" style={{ fontWeight: 700, color: dpdColor(v) }}>
          {v}
        </span>
      ),
    },
    {
      title: 'Next Due',
      dataIndex: 'nextDueDate',
      width: 110,
      render: (v?: string) =>
        v ? (
          <span
            style={{
              fontSize: 12.5,
              color:
                v === dayjs().format('YYYY-MM-DD') ? 'var(--status-warning-fg)' : 'var(--ink-500)',
              fontWeight: v === dayjs().format('YYYY-MM-DD') ? 700 : 400,
            }}
          >
            {v === dayjs().format('YYYY-MM-DD') ? 'Today' : fmtDate(v)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 105,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      render: (_, r) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/lms/accounts/${r.loanNumber}`);
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Loan Accounts"
        subtitle={`Loan management system · ${scoped.length} accounts ${scope ? `· ${scope} portfolio` : ''}`}
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              exportCsv(
                `loan-accounts-${dayjs().format('YYYYMMDD')}`,
                [
                  'Loan Number',
                  'Customer',
                  'Type',
                  'Principal',
                  'Outstanding',
                  'EMI',
                  'DPD',
                  'Status',
                  'Disbursed On',
                ],
                rows.map((l) => [
                  l.loanNumber,
                  l.customerName,
                  l.loanType,
                  l.principal,
                  l.outstandingPrincipal,
                  l.emi,
                  l.dpd,
                  l.status,
                  fmtDate(l.disbursedOn),
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
          { label: 'Active Book', value: open.length, sub: 'open loan accounts' },
          { label: 'Book Outstanding', value: inrCompact(bookSize), sub: 'principal outstanding' },
          { label: 'Overdue Accounts', value: overdueCount, sub: 'DPD 1–90' },
          { label: 'NPA Accounts', value: npaCount, sub: 'DPD 90+' },
        ]}
      />

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
          <Input
            prefix={<SearchOutlined className="u-ink-400" />}
            placeholder="Search loan no, customer, mobile…"
            allowClear
            style={{ width: 290 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!scope && (
            <Select
              aria-label="Loan Type"
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
            aria-label="Status"
            placeholder="Status"
            allowClear
            style={{ width: 140 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={(['ACTIVE', 'OVERDUE', 'NPA', 'CLOSED'] as LoanStatus[]).map((s) => ({
              value: s,
              label: s,
            }))}
          />
        </div>
        <DataTable<LoanAccount>
          dataSource={rows}
          columns={columns}
          rowKey="loanNumber"
          loading={loading}
          size="middle"
          className="row-link"
          scroll={{ x: 1100 }}
          onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} accounts`,
          }}
        />
      </Card>
    </div>
  );
};

export default LoanAccounts;

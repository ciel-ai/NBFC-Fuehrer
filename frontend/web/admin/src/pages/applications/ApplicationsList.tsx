import React, { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Input, Select } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useApplications } from '../../hooks/useApplications';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, inr } from '../../utils/format';
import type { AppStatus, LoanApplication, LoanType } from '../../types';
import DataTable from '../../components/DataTable';
import DataSourceNotice from '../../components/DataSourceNotice';

const { RangePicker } = DatePicker;

export type ListPreset = 'all' | 'submitted' | 'credit-pending' | 'finance-pending' | 'disbursed';

const PRESET_META: Record<ListPreset, { title: string; subtitle: string; statuses?: AppStatus[] }> =
  {
    all: { title: 'All Applications', subtitle: 'Every application sourced across channels' },
    submitted: {
      title: 'Submitted Applications',
      subtitle: 'Fresh applications awaiting credit pickup',
      statuses: ['SUBMITTED'],
    },
    'credit-pending': {
      title: 'Credit Pending',
      subtitle: 'Applications in the underwriting queue',
      statuses: ['CREDIT_PENDING'],
    },
    'finance-pending': {
      title: 'Finance Pending',
      subtitle: 'Credit-approved applications in finance processing',
      statuses: ['CREDIT_APPROVED', 'FINANCE_PENDING', 'EMANDATE_PENDING'],
    },
    disbursed: {
      title: 'Disbursed Applications',
      subtitle: 'Applications converted into live loan accounts',
      statuses: ['DISBURSED', 'ACTIVE', 'CLOSED'],
    },
  };

const ALL_STATUSES: AppStatus[] = [
  'SUBMITTED',
  'CREDIT_PENDING',
  'CREDIT_APPROVED',
  'CREDIT_REJECTED',
  'CREDIT_RETURNED',
  'FINANCE_PENDING',
  'EMANDATE_PENDING',
  'DISBURSED',
  'ACTIVE',
  'CLOSED',
];

const ApplicationsList: React.FC<{ preset: ListPreset }> = ({ preset }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { applications, loading, source, error, reload } = useApplications();
  const scope = scopedLoanType(user.role);
  const meta = PRESET_META[preset];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LoanType | undefined>();
  const [statusFilter, setStatusFilter] = useState<AppStatus | undefined>();
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (scope && a.loanType !== scope) return false;
      if (meta.statuses && !meta.statuses.includes(a.status)) return false;
      if (typeFilter && a.loanType !== typeFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (sourceFilter && a.source !== sourceFilter) return false;
      if (range?.[0] && dayjs(a.createdAt).isBefore(range[0].startOf('day'))) return false;
      if (range?.[1] && dayjs(a.createdAt).isAfter(range[1].endOf('day'))) return false;
      if (q) {
        const hay =
          `${a.appNumber} ${a.customer.name} ${a.customer.mobile} ${a.createdBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, scope, meta.statuses, search, typeFilter, statusFilter, sourceFilter, range]);

  const totalAmount = rows.reduce((s, a) => s + a.loan.amount, 0);

  const columns: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application No.',
      dataIndex: 'appNumber',
      width: 175,
      render: (v: string) => <span className="u-semibold u-accent u-sm">{v}</span>,
      sorter: (a, b) => a.appNumber.localeCompare(b.appNumber),
    },
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      render: (_: string, r) => (
        <div>
          <div className="u-semibold u-ink-900">{r.customer.name}</div>
          <div className="u-xs u-ink-400">+91 {r.customer.mobile}</div>
        </div>
      ),
      sorter: (a, b) => a.customer.name.localeCompare(b.customer.name),
    },
    {
      title: 'Loan Type',
      dataIndex: 'loanType',
      width: 100,
      render: (t: LoanType) => <LoanTypeTag type={t} />,
    },
    {
      title: 'Amount',
      dataIndex: ['loan', 'amount'],
      align: 'right',
      width: 130,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
      sorter: (a, b) => a.loan.amount - b.loan.amount,
    },
    {
      title: 'Source',
      dataIndex: 'source',
      width: 110,
      render: (v: string) => <span className="u-ink-500 u-sm">{v}</span>,
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      width: 150,
      render: (v: string, r) => (
        <div>
          <div className="u-sm u-ink-600">{v}</div>
          <div className="u-xs u-ink-400">{r.createdByCode}</div>
        </div>
      ),
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      width: 125,
      render: (v: string) => <span className="u-ink-500 u-sm">{fmtDate(v)}</span>,
      sorter: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 155,
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
            navigate(`/applications/view/${r.id}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const handleExport = (): void => {
    exportCsv(
      `applications-${preset}-${dayjs().format('YYYYMMDD')}`,
      [
        'Application No',
        'Customer',
        'Mobile',
        'Loan Type',
        'Amount',
        'Source',
        'Created By',
        'Created Date',
        'Status',
      ],
      rows.map((a) => [
        a.appNumber,
        a.customer.name,
        a.customer.mobile,
        a.loanType,
        a.loan.amount,
        a.source,
        a.createdBy,
        fmtDate(a.createdAt),
        a.status,
      ]),
    );
  };

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={`${meta.subtitle} · ${rows.length} records · ${inr(totalAmount)} requested`}
        extra={
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />

      <DataSourceNotice source={source} error={error} onRetry={reload} />

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
            placeholder="Search app no, customer, mobile, agent…"
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
          {preset === 'all' && (
            <Select
              aria-label="Status"
              placeholder="Status"
              allowClear
              style={{ width: 180 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={ALL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />
          )}
          <Select
            aria-label="Source"
            placeholder="Source"
            allowClear
            style={{ width: 140 }}
            value={sourceFilter}
            onChange={setSourceFilter}
            options={['Mobile App', 'Branch', 'DSA', 'Website'].map((s) => ({
              value: s,
              label: s,
            }))}
          />
          <RangePicker
            value={range as any}
            onChange={(v) => setRange(v as any)}
            style={{ width: 250 }}
          />
        </div>
        <DataTable<LoanApplication>
          loading={loading}
          dataSource={rows}
          columns={columns}
          rowKey="id"
          size="middle"
          className="row-link"
          scroll={{ x: 1080 }}
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} applications`,
          }}
        />
      </Card>
    </div>
  );
};

export default ApplicationsList;

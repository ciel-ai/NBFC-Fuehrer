import React, { useMemo, useState } from 'react';
import { Avatar, Button, Card, Input, Select, Table } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { LoanTypeTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtTimeAgo, initials, inr } from '../../utils/format';
import type { CustomerProfile, LoanType } from '../../types';

interface CustomerRow {
  mobile: string;
  customer: CustomerProfile;
  appCount: number;
  loanCount: number;
  products: LoanType[];
  totalRequested: number;
  city: string;
  lastActivity: string;
}

const CustomersList: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const scope = scopedLoanType(user.role);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LoanType | undefined>();

  const rows = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const a of applications) {
      if (scope && a.loanType !== scope) continue;
      const key = a.customer.mobile;
      const existing = map.get(key);
      if (existing) {
        existing.appCount += 1;
        existing.totalRequested += a.loan.amount;
        if (!existing.products.includes(a.loanType)) existing.products.push(a.loanType);
        if (dayjs(a.updatedAt).isAfter(existing.lastActivity)) {
          existing.lastActivity = a.updatedAt;
          existing.customer = a.customer; // keep most recent profile
        }
      } else {
        map.set(key, {
          mobile: key,
          customer: a.customer,
          appCount: 1,
          loanCount: 0,
          products: [a.loanType],
          totalRequested: a.loan.amount,
          city: a.customer.currentAddress.city,
          lastActivity: a.updatedAt,
        });
      }
    }
    for (const l of loans) {
      if (scope && l.loanType !== scope) continue;
      const row = map.get(l.mobile);
      if (row) row.loanCount += 1;
    }
    return [...map.values()].sort((x, y) => dayjs(y.lastActivity).valueOf() - dayjs(x.lastActivity).valueOf());
  }, [applications, loans, scope]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter && !r.products.includes(typeFilter)) return false;
      if (q && !`${r.customer.name} ${r.mobile} ${r.customer.email} ${r.city}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, typeFilter]);

  const columns: TableProps<CustomerRow>['columns'] = [
    {
      title: 'Customer',
      dataIndex: ['customer', 'name'],
      render: (_: string, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar size={38} style={{ background: '#e0f2fe', color: '#0284c7', fontWeight: 700, fontSize: 13 }}>{initials(r.customer.name)}</Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.customer.name}</div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>+91 {r.mobile}</div>
          </div>
        </div>
      ),
      sorter: (a, b) => a.customer.name.localeCompare(b.customer.name),
    },
    { title: 'City', dataIndex: 'city', width: 140, render: (v: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{v}</span> },
    {
      title: 'Products',
      dataIndex: 'products',
      width: 170,
      render: (p: LoanType[]) => <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>{p.map((t) => <LoanTypeTag key={t} type={t} />)}</span>,
    },
    { title: 'Applications', dataIndex: 'appCount', width: 115, align: 'center', render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{v}</span>, sorter: (a, b) => a.appCount - b.appCount },
    { title: 'Live Loans', dataIndex: 'loanCount', width: 105, align: 'center', render: (v: number) => <span className="tnum" style={{ fontWeight: 600, color: v ? '#0f766e' : '#94a3b8' }}>{v}</span>, sorter: (a, b) => a.loanCount - b.loanCount },
    { title: 'Total Requested', dataIndex: 'totalRequested', width: 145, align: 'right', render: (v: number) => <span className="tnum">{inr(v)}</span>, sorter: (a, b) => a.totalRequested - b.totalRequested },
    { title: 'Last Activity', dataIndex: 'lastActivity', width: 130, render: (v: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{fmtTimeAgo(v)}</span>, sorter: (a, b) => dayjs(a.lastActivity).valueOf() - dayjs(b.lastActivity).valueOf(), defaultSortOrder: 'descend' },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      fixed: 'right',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/customers/${r.mobile}`); }}>View</Button>
      ),
    },
  ];

  const handleExport = (): void => {
    exportCsv(
      `customers-${dayjs().format('YYYYMMDD')}`,
      ['Name', 'Mobile', 'Email', 'City', 'Products', 'Applications', 'Live Loans', 'Total Requested'],
      filtered.map((r) => [r.customer.name, r.mobile, r.customer.email, r.city, r.products.join(' / '), r.appCount, r.loanCount, r.totalRequested]),
    );
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`Unified customer directory · ${filtered.length} customers`}
        extra={<Button icon={<DownloadOutlined />} onClick={handleExport}>Export CSV</Button>}
      />

      <Card variant="borderless" style={{ boxShadow: 'var(--shadow-card)' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search name, mobile, email, city…"
            allowClear
            style={{ width: 300 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!scope && (
            <Select
              placeholder="Product"
              allowClear
              style={{ width: 180 }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: 'CDL', label: 'Consumer Durable' },
                { value: 'GOLD', label: 'Gold Loan' },
                { value: 'HOUSING', label: 'Affordable Housing' },
              ]}
            />
          )}
        </div>
        <Table<CustomerRow>
          dataSource={filtered}
          columns={columns}
          rowKey="mobile"
          size="middle"
          className="row-link"
          scroll={{ x: 1080 }}
          onRow={(r) => ({ onClick: () => navigate(`/customers/${r.mobile}`) })}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t} customers` }}
        />
      </Card>
    </div>
  );
};

export default CustomersList;

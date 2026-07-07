import React, { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Input, Select, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import PageHeader from '../../components/PageHeader';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import type { LoanCharge, Repayment } from '../../types';

const cardStyle: React.CSSProperties = { border: '1px solid #e7ebf3' };

// ════ EMI SCHEDULE (cross-portfolio demand view) ════
interface DemandRow {
  key: string;
  loanNumber: string;
  customerName: string;
  loanType: any;
  seq: number;
  dueDate: string;
  emi: number;
  status: string;
}

export const EmiSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const loans = useAppStore((s) => s.loans);
  const scope = scopedLoanType(user.role);
  const [month, setMonth] = useState<Dayjs>(dayjs());
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const out: DemandRow[] = [];
    loans
      .filter((l) => (!scope || l.loanType === scope) && l.status !== 'CLOSED')
      .forEach((l) => {
        l.schedule.forEach((e) => {
          if (dayjs(e.dueDate).isSame(month, 'month')) {
            out.push({
              key: `${l.loanNumber}-${e.seq}`,
              loanNumber: l.loanNumber,
              customerName: l.customerName,
              loanType: l.loanType,
              seq: e.seq,
              dueDate: e.dueDate,
              emi: e.emi,
              status: e.status,
            });
          }
        });
      });
    const q = search.trim().toLowerCase();
    return out
      .filter((r) => !q || `${r.loanNumber} ${r.customerName}`.toLowerCase().includes(q))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [loans, scope, month, search]);

  const demand = rows.reduce((s, r) => s + r.emi, 0);
  const collected = rows.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.emi, 0);

  const cols: TableProps<DemandRow>['columns'] = [
    { title: 'Loan Number', dataIndex: 'loanNumber', width: 185, render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
    { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'EMI #', dataIndex: 'seq', width: 75, align: 'center' },
    { title: 'Due Date', dataIndex: 'dueDate', width: 120, render: (v: string) => <span style={{ color: v === dayjs().format('YYYY-MM-DD') ? '#d97706' : '#475569', fontWeight: v === dayjs().format('YYYY-MM-DD') ? 700 : 400, fontSize: 12.5 }}>{fmtDate(v)}</span> },
    { title: 'EMI Amount', dataIndex: 'emi', align: 'right', width: 125, render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title="EMI Schedule"
        subtitle={`Demand register for ${month.format('MMMM YYYY')} · ${inr(demand)} demand · ${inr(collected)} collected`}
        extra={
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(`emi-demand-${month.format('YYYYMM')}`, ['Loan', 'Customer', 'Type', 'EMI #', 'Due Date', 'Amount', 'Status'], rows.map((r) => [r.loanNumber, r.customerName, r.loanType, r.seq, r.dueDate, r.emi, r.status]))}>
            Export CSV
          </Button>
        }
      />
      <Card variant="borderless" style={cardStyle} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v)} allowClear={false} style={{ width: 160 }} />
          <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} placeholder="Search loan, customer…" allowClear style={{ width: 270 }} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Table<DemandRow>
          dataSource={rows}
          columns={cols}
          rowKey="key"
          size="middle"
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} instalments` }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

// ════ REPAYMENTS ════
export const RepaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const repayments = useAppStore((s) => s.repayments);
  const scope = scopedLoanType(user.role);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modeFilter, setModeFilter] = useState<string | undefined>();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return repayments.filter((r) => {
      if (scope && r.loanType !== scope) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (modeFilter && r.mode !== modeFilter) return false;
      if (q && !`${r.loanNumber} ${r.customerName} ${r.reference}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [repayments, scope, search, statusFilter, modeFilter]);

  const collected = rows.filter((r) => r.status === 'SUCCESS').reduce((s, r) => s + r.amount, 0);

  const cols: TableProps<Repayment>['columns'] = [
    { title: 'Date', dataIndex: 'date', width: 170, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}>{fmtDateTime(v)}</span>, sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(), defaultSortOrder: 'descend' },
    { title: 'Loan Number', dataIndex: 'loanNumber', width: 185, render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
    { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 120, render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span>, sorter: (a, b) => a.amount - b.amount },
    { title: 'Mode', dataIndex: 'mode', width: 110, render: (v: string) => <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v}</Tag> },
    { title: 'Reference', dataIndex: 'reference', width: 150, render: (v: string) => <span className="tnum" style={{ fontSize: 12, color: '#64748b' }}>{v}</span> },
    { title: 'Txn Type', dataIndex: 'type', width: 115, render: (v: string) => <span style={{ fontSize: 12, fontWeight: v === 'RECOVERY' ? 600 : 400, color: v === 'RECOVERY' ? '#b91c1c' : '#475569' }}>{v.replace(/_/g, ' ')}</span> },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Repayments"
        subtitle={`${rows.length} transactions · ${inr(collected)} successfully collected`}
        extra={
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(`repayments-${dayjs().format('YYYYMMDD')}`, ['Date', 'Loan', 'Customer', 'Type', 'Amount', 'Mode', 'Reference', 'Txn Type', 'Status'], rows.map((r) => [fmtDateTime(r.date), r.loanNumber, r.customerName, r.loanType, r.amount, r.mode, r.reference, r.type, r.status]))}>
            Export CSV
          </Button>
        }
      />
      <Card variant="borderless" style={cardStyle} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} placeholder="Search loan, customer, reference…" allowClear style={{ width: 290 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Status" allowClear style={{ width: 130 }} value={statusFilter} onChange={setStatusFilter} options={['SUCCESS', 'BOUNCED', 'PENDING'].map((s) => ({ value: s, label: s }))} />
          <Select placeholder="Mode" allowClear style={{ width: 140 }} value={modeFilter} onChange={setModeFilter} options={['E-MANDATE', 'UPI', 'NEFT', 'CASH', 'CHEQUE'].map((s) => ({ value: s, label: s }))} />
        </div>
        <Table<Repayment>
          dataSource={rows}
          columns={cols}
          rowKey="id"
          size="middle"
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          pagination={{ pageSize: 12, showSizeChanger: true, showTotal: (t, r0) => `${r0[0]}–${r0[1]} of ${t}` }}
          scroll={{ x: 1150 }}
        />
      </Card>
    </div>
  );
};

// ════ CHARGES ════
export const ChargesPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const charges = useAppStore((s) => s.charges);
  const scope = scopedLoanType(user.role);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return charges.filter((c) => {
      if (scope && c.loanType !== scope) return false;
      if (typeFilter && c.type !== typeFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (q && !`${c.loanNumber} ${c.customerName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [charges, scope, search, typeFilter, statusFilter]);

  const unpaid = rows.filter((c) => c.status === 'UNPAID').reduce((s, c) => s + c.amount + c.gst, 0);

  const cols: TableProps<LoanCharge>['columns'] = [
    { title: 'Date', dataIndex: 'date', width: 125, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}>{fmtDate(v)}</span>, sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(), defaultSortOrder: 'descend' },
    { title: 'Loan Number', dataIndex: 'loanNumber', width: 185, render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
    { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Charge', dataIndex: 'type', width: 170, render: (v: string) => <span style={{ fontSize: 12.5, fontWeight: 600 }}>{v.replace(/_/g, ' ')}</span> },
    { title: 'Amount', dataIndex: 'amount', align: 'right', width: 110, render: (v: number) => <span className="tnum">{inr(v)}</span> },
    { title: 'GST', dataIndex: 'gst', align: 'right', width: 90, render: (v: number) => <span className="tnum" style={{ color: '#64748b' }}>{inr(v)}</span> },
    { title: 'Total', key: 'total', align: 'right', width: 110, render: (_, r) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(r.amount + r.gst)}</span> },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Charges"
        subtitle={`${rows.length} charge entries · ${inr(unpaid)} unpaid`}
        extra={
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(`charges-${dayjs().format('YYYYMMDD')}`, ['Date', 'Loan', 'Customer', 'Type', 'Charge', 'Amount', 'GST', 'Status'], rows.map((c) => [fmtDate(c.date), c.loanNumber, c.customerName, c.loanType, c.type, c.amount, c.gst, c.status]))}>
            Export CSV
          </Button>
        }
      />
      <Card variant="borderless" style={cardStyle} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} placeholder="Search loan, customer…" allowClear style={{ width: 270 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Charge Type" allowClear style={{ width: 190 }} value={typeFilter} onChange={setTypeFilter}
            options={['PROCESSING_FEE', 'BOUNCE_CHARGE', 'PENAL_INTEREST', 'FORECLOSURE_CHARGE', 'LEGAL_CHARGE'].map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
          <Select placeholder="Status" allowClear style={{ width: 130 }} value={statusFilter} onChange={setStatusFilter} options={['PAID', 'UNPAID', 'WAIVED'].map((s) => ({ value: s, label: s }))} />
        </div>
        <Table<LoanCharge>
          dataSource={rows}
          columns={cols}
          rowKey="id"
          size="middle"
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} entries` }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

// ════ DOCUMENTS (repository across disbursed loans) ════
interface DocRow {
  key: string;
  appId: string;
  appNumber: string;
  loanNumber?: string;
  customerName: string;
  loanType: any;
  name: string;
  category: string;
  fileName: string;
  sizeKB: number;
  uploadedAt: string;
  status: string;
}

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const scope = scopedLoanType(user.role);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | undefined>();

  const rows = useMemo(() => {
    const out: DocRow[] = [];
    applications
      .filter((a) => (!scope || a.loanType === scope) && a.loanNumber)
      .forEach((a) => {
        a.documents.forEach((d) => {
          out.push({
            key: d.id,
            appId: a.id,
            appNumber: a.appNumber,
            loanNumber: a.loanNumber,
            customerName: a.customer.name,
            loanType: a.loanType,
            name: d.name,
            category: d.category,
            fileName: d.fileName,
            sizeKB: d.sizeKB,
            uploadedAt: d.uploadedAt,
            status: d.status,
          });
        });
      });
    const q = search.trim().toLowerCase();
    return out.filter((r) => {
      if (catFilter && r.category !== catFilter) return false;
      if (q && !`${r.loanNumber} ${r.appNumber} ${r.customerName} ${r.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [applications, scope, search, catFilter]);

  const cols: TableProps<DocRow>['columns'] = [
    { title: 'Document', dataIndex: 'name', render: (v: string, r) => <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{v}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.fileName} · {(r.sizeKB / 1024).toFixed(1)} MB</div></div> },
    { title: 'Category', dataIndex: 'category', width: 110, render: (v: string) => <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v}</Tag> },
    { title: 'Loan Account', dataIndex: 'loanNumber', width: 185, render: (v?: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
    { title: 'Customer', dataIndex: 'customerName', width: 170, render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Uploaded', dataIndex: 'uploadedAt', width: 120, render: (v: string) => <span style={{ fontSize: 12.5, color: '#64748b' }}>{fmtDate(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 100, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader title="Document Repository" subtitle={`${rows.length} documents across disbursed loan files`} />
      <Card variant="borderless" style={cardStyle} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 10, padding: '16px 18px', flexWrap: 'wrap', borderBottom: '1px solid #eef1f7' }}>
          <Input prefix={<SearchOutlined style={{ color: '#94a3b8' }} />} placeholder="Search loan, customer, document…" allowClear style={{ width: 300 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select placeholder="Category" allowClear style={{ width: 150 }} value={catFilter} onChange={setCatFilter} options={['KYC', 'Income', 'Banking', 'Collateral', 'Other'].map((s) => ({ value: s, label: s }))} />
        </div>
        <Table<DocRow>
          dataSource={rows}
          columns={cols}
          rowKey="key"
          size="middle"
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.appId}`) })}
          pagination={{ pageSize: 12, showTotal: (t) => `${t} documents` }}
          scroll={{ x: 1050 }}
        />
      </Card>
    </div>
  );
};

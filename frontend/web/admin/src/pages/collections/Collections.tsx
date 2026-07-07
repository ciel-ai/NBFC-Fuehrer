import React, { useMemo, useState } from 'react';
import { App, Button, Card, Col, DatePicker, Drawer, Form, Input, Row, Segmented, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import {
  CalendarOutlined, DollarOutlined, DownloadOutlined, ExclamationCircleOutlined,
  EyeOutlined, PhoneOutlined, SearchOutlined, WarningOutlined, FundOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import PageHeader from '../../components/PageHeader';
import KpiCard from '../../components/KpiCard';
import { LoanTypeTag, StatusTag, dpdColor } from '../../components/StatusTag';
import { exportCsv } from '../../utils/csv';
import { dpdBucket, fmtDate, inr, inrCompact } from '../../utils/format';
import { recoveryThisMonth } from '../../utils/analytics';
import type { LoanAccount, Repayment } from '../../types';
import { collectionsApi } from '../../api/collections.api';

type CollTab = 'due-today' | 'overdue' | 'npa' | 'recovery';

const TAB_LABEL: Record<CollTab, string> = {
  'due-today': 'Due Today',
  overdue: 'Overdue',
  npa: 'NPA',
  recovery: 'Recovery',
};

const Collections: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { tab = 'due-today' } = useParams<{ tab: CollTab }>();
  const activeTab = (Object.keys(TAB_LABEL).includes(tab) ? tab : 'due-today') as CollTab;
  const user = useAuthStore((s) => s.user)!;
  const loans = useAppStore((s) => s.loans);
  const repayments = useAppStore((s) => s.repayments);
  const logCollectionNote = useAppStore((s) => s.logCollectionNote);
  // Live collection cases — fetched for connectivity; screen merge is the
  // next Step-3 task (buckets below still derive from the local store).
  const [, setRealCases] = React.useState<unknown[]>([]);

  React.useEffect(() => {
    collectionsApi.listCases({ limit: 100 })
      .then((res) => { if (res.data?.length) setRealCases(res.data); })
      .catch(() => {});
  }, []);
  const [search, setSearch] = useState('');
  const [noteLoan, setNoteLoan] = useState<LoanAccount | null>(null);
  const [noteForm] = Form.useForm();

  const today = dayjs().format('YYYY-MM-DD');

  const buckets = useMemo(() => ({
    'due-today': loans.filter((l) => l.status !== 'CLOSED' && l.nextDueDate === today && l.dpd === 0),
    overdue: loans.filter((l) => l.status === 'OVERDUE'),
    npa: loans.filter((l) => l.status === 'NPA'),
  }), [loans, today]);

  const recoveryTxns = useMemo(
    () => repayments.filter((r) => r.type === 'RECOVERY' && r.status === 'SUCCESS'),
    [repayments],
  );

  const kpis = useMemo(() => ({
    dueTodayAmt: buckets['due-today'].reduce((s, l) => s + l.emi, 0),
    overdueAmt: buckets.overdue.reduce((s, l) => s + l.overdueAmount, 0),
    npaOutstanding: buckets.npa.reduce((s, l) => s + l.outstandingPrincipal, 0),
    recovered: recoveryThisMonth(repayments),
  }), [buckets, repayments]);

  const loanRows = useMemo(() => {
    if (activeTab === 'recovery') return [];
    const q = search.trim().toLowerCase();
    return buckets[activeTab].filter((l) => !q || `${l.loanNumber} ${l.customerName} ${l.mobile}`.toLowerCase().includes(q));
  }, [buckets, activeTab, search]);

  const recoveryRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recoveryTxns.filter((r) => !q || `${r.loanNumber} ${r.customerName}`.toLowerCase().includes(q));
  }, [recoveryTxns, search]);

  const loanCols: TableProps<LoanAccount>['columns'] = [
    { title: 'Loan Number', dataIndex: 'loanNumber', width: 180, render: (v: string) => <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 12.5 }}>{v}</span> },
    {
      title: 'Customer', dataIndex: 'customerName',
      render: (v: string, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{v}</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}><PhoneOutlined style={{ marginRight: 4 }} />+91 {r.mobile}</div>
        </div>
      ),
    },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    {
      title: 'Outstanding', dataIndex: 'outstandingPrincipal', align: 'right', width: 125,
      sorter: (a, b) => a.outstandingPrincipal - b.outstandingPrincipal,
      render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span>,
    },
    {
      title: activeTab === 'due-today' ? 'EMI Due' : 'Overdue Amt',
      key: 'dueAmt', align: 'right', width: 120,
      render: (_, r) => <span className="tnum" style={{ fontWeight: 700, color: activeTab === 'due-today' ? '#d97706' : '#dc2626' }}>{inr(activeTab === 'due-today' ? r.emi : r.overdueAmount)}</span>,
    },
    {
      title: 'Last Payment', key: 'lastPay', width: 145,
      render: (_, r) => r.lastPaymentDate
        ? <div><div className="tnum" style={{ fontSize: 12.5 }}>{inr(r.lastPaymentAmount ?? 0)}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtDate(r.lastPaymentDate)}</div></div>
        : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    { title: 'Next Due', dataIndex: 'nextDueDate', width: 110, render: (v?: string) => <span style={{ fontSize: 12.5, color: v === today ? '#d97706' : '#64748b', fontWeight: v === today ? 700 : 400 }}>{v === today ? 'Today' : fmtDate(v)}</span> },
    {
      title: 'DPD / Bucket', dataIndex: 'dpd', width: 115, align: 'center',
      sorter: (a, b) => a.dpd - b.dpd, defaultSortOrder: activeTab === 'due-today' ? undefined : 'descend',
      render: (v: number) => (
        <div>
          <span className="tnum" style={{ fontWeight: 700, color: dpdColor(v) }}>{v}</span>
          <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{dpdBucket(v)}</div>
        </div>
      ),
    },
    { title: 'Collection Status', dataIndex: 'collectionStatus', width: 130, render: (s: string) => <StatusTag status={s} /> },
    {
      title: 'Action', key: 'action', width: 175, fixed: 'right',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/lms/accounts/${r.loanNumber}`); }}>Open</Button>
          <Button size="small" type="primary" ghost icon={<PhoneOutlined />} onClick={(e) => { e.stopPropagation(); setNoteLoan(r); noteForm.resetFields(); }}>Log</Button>
        </div>
      ),
    },
  ];

  const recoveryCols: TableProps<Repayment>['columns'] = [
    { title: 'Date', dataIndex: 'date', width: 150, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}>{fmtDate(v)}</span>, sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(), defaultSortOrder: 'descend' },
    { title: 'Loan Number', dataIndex: 'loanNumber', width: 185, render: (v: string) => <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 12.5 }}>{v}</span> },
    { title: 'Customer', dataIndex: 'customerName', render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Type', dataIndex: 'loanType', width: 90, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Recovered', dataIndex: 'amount', align: 'right', width: 130, render: (v: number) => <span className="tnum" style={{ fontWeight: 700, color: '#047857' }}>{inr(v)}</span> },
    { title: 'Mode', dataIndex: 'mode', width: 100, render: (v: string) => <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v}</Tag> },
    { title: 'Reference', dataIndex: 'reference', width: 140, render: (v: string) => <span className="tnum" style={{ fontSize: 12, color: '#64748b' }}>{v}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Collections Command Center"
        subtitle="Demand follow-up, delinquency management and recovery tracking"
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              if (activeTab === 'recovery') {
                exportCsv(`recovery-${dayjs().format('YYYYMMDD')}`, ['Date', 'Loan', 'Customer', 'Type', 'Amount', 'Mode', 'Reference'],
                  recoveryRows.map((r) => [fmtDate(r.date), r.loanNumber, r.customerName, r.loanType, r.amount, r.mode, r.reference]));
              } else {
                exportCsv(`collections-${activeTab}-${dayjs().format('YYYYMMDD')}`,
                  ['Loan', 'Customer', 'Mobile', 'Type', 'Outstanding', 'Overdue', 'DPD', 'Collection Status'],
                  loanRows.map((l) => [l.loanNumber, l.customerName, l.mobile, l.loanType, l.outstandingPrincipal, l.overdueAmount, l.dpd, l.collectionStatus]));
              }
            }}
          >
            Export CSV
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Due Today" value={buckets['due-today'].length} sub={inr(kpis.dueTodayAmt) + ' collectible'} icon={<CalendarOutlined />} tint="#d97706" onClick={() => navigate('/collections/due-today')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Overdue Accounts" value={buckets.overdue.length} sub={inr(kpis.overdueAmt) + ' overdue'} icon={<ExclamationCircleOutlined />} tint="#ea580c" onClick={() => navigate('/collections/overdue')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="NPA Accounts" value={buckets.npa.length} sub={inrCompact(kpis.npaOutstanding) + ' outstanding'} icon={<WarningOutlined />} tint="#dc2626" onClick={() => navigate('/collections/npa')} /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Recovery (Month)" value={inrCompact(kpis.recovered)} sub={`${recoveryTxns.length} recovery receipts total`} icon={<FundOutlined />} tint="#047857" onClick={() => navigate('/collections/recovery')} /></Col>
      </Row>

      <Card variant="borderless" style={{ border: '1px solid #e7ebf3' }} styles={{ body: { padding: 0 } }}>
        <div style={{ display: 'flex', gap: 12, padding: '16px 18px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eef1f7' }}>
          <Segmented
            value={activeTab}
            onChange={(v) => navigate(`/collections/${v}`)}
            options={(Object.keys(TAB_LABEL) as CollTab[]).map((t) => ({
              value: t,
              label: `${TAB_LABEL[t]} (${t === 'recovery' ? recoveryTxns.length : buckets[t].length})`,
            }))}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search loan, customer…"
            allowClear
            style={{ width: 270, marginLeft: 'auto' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {activeTab === 'recovery' ? (
          <Table<Repayment>
            dataSource={recoveryRows}
            columns={recoveryCols}
            rowKey="id"
            size="middle"
            className="row-link"
            onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
            pagination={{ pageSize: 10, showTotal: (t) => `${t} receipts` }}
            scroll={{ x: 950 }}
          />
        ) : (
          <Table<LoanAccount>
            dataSource={loanRows}
            columns={loanCols}
            rowKey="loanNumber"
            size="middle"
            className="row-link"
            onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
            pagination={{ pageSize: 10, showTotal: (t) => `${t} accounts` }}
            scroll={{ x: 1280 }}
          />
        )}
      </Card>

      {/* follow-up drawer */}
      <Drawer
        title={<span><PhoneOutlined style={{ color: '#d97706', marginRight: 8 }} />Log Follow-up — {noteLoan?.loanNumber}</span>}
        open={!!noteLoan}
        onClose={() => setNoteLoan(null)}
        width={440}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setNoteLoan(null)}>Cancel</Button>
            <Button type="primary" icon={<DollarOutlined />} onClick={() => noteForm.submit()}>Save Note</Button>
          </div>
        }
      >
        {noteLoan && (
          <>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f8fafd', border: '1px solid #eef1f7', marginBottom: 18, fontSize: 12.5, color: '#475569' }}>
              <strong>{noteLoan.customerName}</strong> · +91 {noteLoan.mobile}
              <div style={{ marginTop: 4 }}>
                Outstanding <strong className="tnum">{inr(noteLoan.outstandingPrincipal)}</strong> ·
                Overdue <strong className="tnum" style={{ color: '#dc2626' }}> {inr(noteLoan.overdueAmount)}</strong> ·
                DPD <strong style={{ color: dpdColor(noteLoan.dpd) }}>{noteLoan.dpd}</strong>
              </div>
            </div>
            <Form
              form={noteForm}
              layout="vertical"
              requiredMark={false}
              onFinish={(values: { note: string; ptpDate?: dayjs.Dayjs }) => {
                logCollectionNote(noteLoan.loanNumber, values.note, values.ptpDate?.format('YYYY-MM-DD'), { name: user.name, role: user.role });
                message.success('Follow-up logged' + (values.ptpDate ? ' with PTP' : ''));
                setNoteLoan(null);
              }}
            >
              <Form.Item label="Interaction Note" name="note" rules={[{ required: true, message: 'Describe the interaction' }, { min: 10, message: 'At least 10 characters' }]}>
                <Input.TextArea rows={4} placeholder="Spoke to customer; promised payment by…" showCount maxLength={300} />
              </Form.Item>
              <Form.Item label="Promise-to-Pay Date (optional)" name="ptpDate">
                <DatePicker style={{ width: '100%' }} minDate={dayjs().add(1, 'day')} format="DD MMM YYYY" />
              </Form.Item>
            </Form>
            {noteLoan.collectionNotes.length > 0 && (
              <>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94a3b8', margin: '16px 0 10px' }}>Previous Notes</div>
                {noteLoan.collectionNotes.map((n, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: '#475569', background: '#fffbeb', border: '1px solid #fde9c8', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
                    “{n.note}”
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{n.by} · {fmtDate(n.at)}{n.ptpDate && <> · PTP {fmtDate(n.ptpDate)}</>}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
};

export default Collections;

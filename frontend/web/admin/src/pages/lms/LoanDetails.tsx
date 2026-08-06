import React, { useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  InputNumber,
  Modal,
  Progress,
  Result,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PercentageOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { isAdmin } from '../../auth/rbac';
import { useAuthStore } from '../../store/authStore';
import { useLoanAccount } from '../../hooks/useLms';
import { ErrorState, PageLoader } from '../../components/StateViews';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { MandatePanel, MandateStatusTag } from '../../components/MandatePanel';
import { MigratedTag } from '../../components/MigratedTag';
import { LoanTypeTag, StatusTag, dpdColor } from '../../components/StatusTag';
import { DocumentsTab } from '../applications/tabs';
import { fmtDate, fmtDateTime, initials, inr } from '../../utils/format';
import type { EmiRow, LoanCharge, Repayment } from '../../types';

const panel: React.CSSProperties = {};

const LoanDetails: React.FC = () => {
  const { loanNumber } = useParams<{ loanNumber: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const { loan, live, loading, error, payments, reload } = useLoanAccount(loanNumber);
  const applications = useAppStore((s) => s.applications);
  const repayments = useAppStore((s) => s.repayments);
  const charges = useAppStore((s) => s.charges);
  const recordPayment = useAppStore((s) => s.recordPayment);
  const app = useMemo(
    () => applications.find((a) => a.id === loan?.applicationId),
    [applications, loan],
  );
  const storeRepayments = useMemo(
    () => repayments.filter((r) => r.loanNumber === loanNumber),
    [repayments, loanNumber],
  );
  const loanRepayments = payments ?? storeRepayments;
  const loanCharges = useMemo(
    () => charges.filter((c) => c.loanNumber === loanNumber),
    [charges, loanNumber],
  );

  const [payModal, setPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<Repayment['mode']>('UPI');

  // The last spinner in the app. A skeleton holds the page's real shape, so the
  // layout does not jump when the account lands.
  if (loading && !loan) {
    return <PageLoader />;
  }

  /* Not-found and fetch-failed are different things and were previously the same
     dead-end 404. If the lookup actually failed, say why and offer a retry —
     bouncing someone back to the list loses the loan number they were chasing. */
  if (!loan) {
    return error ? (
      <ErrorState title="Could not load this loan account" detail={error} onRetry={reload} />
    ) : (
      <Result
        status="404"
        title="Loan account not found"
        subTitle={loanNumber ? `No account matches ${loanNumber}.` : undefined}
        extra={
          <Button type="primary" onClick={() => navigate('/lms/accounts')}>
            Back to Loan Accounts
          </Button>
        }
      />
    );
  }

  const paidPct = Math.round((loan.paidCount / loan.tenureMonths) * 100);
  const dueAmount =
    loan.overdueAmount + (loan.nextDueDate === dayjs().format('YYYY-MM-DD') ? loan.emi : 0);
  const canCollect = isAdmin(user.role) && loan.status !== 'CLOSED';

  const emiCols: TableProps<EmiRow>['columns'] = [
    {
      title: '#',
      dataIndex: 'seq',
      width: 56,
      align: 'center',
      render: (v: number) => <span className="tnum u-ink-400">{v}</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      width: 120,
      render: (v: string) => <span className="u-sm u-ink-600">{fmtDate(v)}</span>,
    },
    {
      title: 'EMI',
      dataIndex: 'emi',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'Principal',
      dataIndex: 'principal',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tnum u-ink-600">{inr(v)}</span>,
    },
    {
      title: 'Interest',
      dataIndex: 'interest',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tnum u-ink-600">{inr(v)}</span>,
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      align: 'right',
      width: 125,
      render: (v: number) => <span className="tnum u-ink-500">{inr(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 105,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Paid On',
      dataIndex: 'paidOn',
      width: 120,
      render: (v?: string, r?) =>
        v ? (
          <span
            style={{
              fontSize: 12.5,
              color: dayjs(v).isAfter(dayjs(r!.dueDate))
                ? 'var(--status-warning-fg)'
                : 'var(--status-success-fg)',
            }}
          >
            {fmtDate(v)}
          </span>
        ) : (
          <span style={{ color: 'var(--ink-200)' }}>—</span>
        ),
    },
  ];

  const rptCols: TableProps<Repayment>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 165,
      render: (v: string) => <span className="u-sm u-ink-600">{fmtDateTime(v)}</span>,
      sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      width: 115,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'Mode',
      dataIndex: 'mode',
      width: 110,
      render: (v: string) => <Tag style={{ borderRadius: 6, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      width: 160,
      render: (v: string) => <span className="tnum u-sm u-ink-500">{v}</span>,
    },
    {
      title: 'EMI #',
      dataIndex: 'emiSeq',
      width: 70,
      align: 'center',
      render: (v?: number) => v ?? '—',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (v: string) => (
        <span
          style={{
            fontSize: 12,
            color: v === 'RECOVERY' ? 'var(--status-danger-fg)' : 'var(--ink-600)',
            fontWeight: v === 'RECOVERY' ? 600 : 400,
          }}
        >
          {v.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
  ];

  const chgCols: TableProps<LoanCharge>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'date',
      width: 130,
      render: (v: string) => <span className="u-sm u-ink-600">{fmtDate(v)}</span>,
    },
    {
      title: 'Charge Type',
      dataIndex: 'type',
      render: (v: string) => <span className="u-semibold u-sm">{v.replace(/_/g, ' ')}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      width: 115,
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    {
      title: 'GST',
      dataIndex: 'gst',
      align: 'right',
      width: 90,
      render: (v: number) => <span className="tnum u-ink-500">{inr(v)}</span>,
    },
    {
      title: 'Total',
      key: 'total',
      align: 'right',
      width: 115,
      render: (_, r) => <span className="tnum u-semibold">{inr(r.amount + r.gst)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag status={s} />,
    },
  ];

  return (
    <div>
      {/* header */}
      <Card style={{ ...panel, marginBottom: 16 }} styles={{ body: { padding: '18px 22px' } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
            <Avatar
              size={52}
              style={{
                background: 'var(--status-success-fg)',
                fontWeight: 600,
                fontSize: 17,
                minWidth: 52,
              }}
            >
              {initials(loan.customerName)}
            </Avatar>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>
                  {loan.customerName}
                </span>
                <StatusTag status={loan.status} size="md" />
                <LoanTypeTag type={loan.loanType} full />
                {loan.dpd > 0 && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontWeight: 700,
                      color: dpdColor(loan.dpd),
                      background: `${dpdColor(loan.dpd)}12`,
                      borderColor: `${dpdColor(loan.dpd)}30`,
                    }}
                  >
                    DPD {loan.dpd}
                  </Tag>
                )}
                {/* Mandate health belongs in the header, not buried in a tab: a
                    dead mandate on an active loan is a collections problem the
                    moment someone opens the file. */}
                {loan.mandate && loan.status !== 'CLOSED' && (
                  <MandateStatusTag status={loan.mandate.status} />
                )}
                {loan.migratedFrom && <MigratedTag origin={loan.migratedFrom} />}
                {!live && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontSize: 10.5,
                      color: 'var(--status-warning-fg)',
                      background: 'var(--status-warning-tint)',
                      borderColor: 'var(--status-warning-tint)',
                    }}
                  >
                    SAMPLE DATA
                  </Tag>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  marginTop: 6,
                  fontSize: 12.5,
                  color: 'var(--ink-400)',
                  flexWrap: 'wrap',
                }}
              >
                <span className="u-semibold u-accent">{loan.loanNumber}</span>
                <span>+91 {loan.mobile}</span>
                <span>{loan.branch}</span>
                {app && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', fontSize: 12.5 }}
                    onClick={() => navigate(`/applications/view/${app.id}`)}
                  >
                    {loan.appNumber} ↗
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  color: 'var(--ink-400)',
                }}
              >
                Outstanding
              </div>
              <div
                className="tnum"
                style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-900)' }}
              >
                {inr(loan.outstandingPrincipal)}
              </div>
              <div className="u-xs u-ink-400">of {inr(loan.principal)} disbursed</div>
            </div>
            {dueAmount > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: 'var(--status-danger-fg)',
                  }}
                >
                  Due Now
                </div>
                <div
                  className="tnum"
                  style={{ fontSize: 22, fontWeight: 700, color: 'var(--status-danger-fg)' }}
                >
                  {inr(dueAmount)}
                </div>
                <div className="u-xs u-ink-400">incl. overdue EMIs</div>
              </div>
            )}
            {canCollect && (
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={() => {
                  setPayAmount(dueAmount || loan.emi);
                  setPayModal(true);
                }}
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <WalletOutlined /> Overview
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card style={panel} styles={{ body: { padding: '20px 22px' } }}>
                    <SectionTitle>
                      <FileTextOutlined /> Loan Terms
                    </SectionTitle>
                    <InfoGrid cols={3}>
                      <InfoItem
                        label="Principal"
                        value={<span className="tnum u-semibold u-md">{inr(loan.principal)}</span>}
                      />
                      <InfoItem
                        label="Interest Rate"
                        value={`${loan.interestRate}% p.a. (reducing)`}
                      />
                      <InfoItem label="Tenure" value={`${loan.tenureMonths} months`} />
                      <InfoItem
                        label="EMI"
                        value={<span className="tnum u-semibold">{inr(loan.emi)}</span>}
                      />
                      <InfoItem label="Disbursed On" value={fmtDate(loan.disbursedOn)} />
                      <InfoItem label="First EMI" value={fmtDate(loan.firstEmiDate)} />
                      <InfoItem
                        label="Next Due"
                        value={loan.nextDueDate ? fmtDate(loan.nextDueDate) : '—'}
                      />
                      <InfoItem
                        label="Last Payment"
                        value={
                          loan.lastPaymentDate
                            ? `${inr(loan.lastPaymentAmount ?? 0)} on ${fmtDate(loan.lastPaymentDate)}`
                            : '—'
                        }
                      />
                      <InfoItem
                        label="Collection Status"
                        value={<StatusTag status={loan.collectionStatus} />}
                      />
                      {loan.migratedFrom && (
                        <>
                          <InfoItem
                            label="Legacy Loan No."
                            numeric
                            value={loan.migratedFrom.legacyLoanNumber}
                          />
                          <InfoItem
                            label="Migrated From"
                            value={`${loan.migratedFrom.system} · ${fmtDate(loan.migratedFrom.migratedOn)}`}
                          />
                        </>
                      )}
                    </InfoGrid>
                    <div
                      style={{
                        marginTop: 20,
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'var(--ink-50)',
                        border: '1px solid var(--ink-100)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}
                      >
                        <span className="u-sm u-semibold u-ink-600">Repayment Progress</span>
                        <span className="tnum u-sm u-semibold">
                          {loan.paidCount} of {loan.tenureMonths} EMIs · {paidPct}%
                        </span>
                      </div>
                      <Progress
                        percent={paidPct}
                        showInfo={false}
                        strokeColor={
                          loan.status === 'NPA'
                            ? 'var(--status-danger-fg)'
                            : 'var(--status-success-fg)'
                        }
                        trailColor="var(--ink-150)"
                      />
                    </div>
                  </Card>
                </Col>
                <Col xs={24} lg={10}>
                  <Card style={panel} styles={{ body: { padding: '20px 22px' } }}>
                    <SectionTitle>
                      <PercentageOutlined /> Account Health
                    </SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        {
                          label: 'Days Past Due',
                          value: (
                            <span
                              className="tnum"
                              style={{ fontWeight: 700, color: dpdColor(loan.dpd) }}
                            >
                              {loan.dpd} days
                            </span>
                          ),
                        },
                        {
                          label: 'Overdue Amount',
                          value: (
                            <span
                              className="tnum"
                              style={{
                                fontWeight: 700,
                                color: loan.overdueAmount
                                  ? 'var(--status-danger-fg)'
                                  : 'var(--status-success-fg)',
                              }}
                            >
                              {inr(loan.overdueAmount)}
                            </span>
                          ),
                        },
                        {
                          label: 'Unpaid Charges',
                          value: (
                            <span className="tnum">
                              {inr(
                                loanCharges
                                  .filter((c) => c.status === 'UNPAID')
                                  .reduce((s, c) => s + c.amount + c.gst, 0),
                              )}
                            </span>
                          ),
                        },
                        {
                          label: 'Bounced Presentations',
                          value: (
                            <span className="tnum">
                              {loanRepayments.filter((r) => r.status === 'BOUNCED').length}
                            </span>
                          ),
                        },
                        {
                          label: 'Interest Paid Till Date',
                          value: (
                            <span className="tnum">
                              {inr(
                                loan.schedule
                                  .filter((e) => e.status === 'PAID')
                                  .reduce((s, e) => s + e.interest, 0),
                              )}
                            </span>
                          ),
                        },
                      ].map((x) => (
                        <div
                          key={x.label}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: 'var(--ink-50)',
                            border: '1px solid var(--ink-100)',
                          }}
                        >
                          <span className="u-base u-ink-600">{x.label}</span>
                          {x.value}
                        </div>
                      ))}
                    </div>
                    {loan.collectionNotes.length > 0 && (
                      <>
                        <SectionTitle>Collection Notes</SectionTitle>
                        {loan.collectionNotes.slice(0, 3).map((n, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 12.5,
                              color: 'var(--ink-600)',
                              background: 'var(--status-warning-tint)',
                              border: '1px solid var(--status-warning-tint)',
                              borderRadius: 10,
                              padding: '8px 12px',
                              marginBottom: 6,
                            }}
                          >
                            “{n.note}”
                            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 3 }}>
                              {n.by} · {fmtDate(n.at)}
                              {n.ptpDate && <> · PTP {fmtDate(n.ptpDate)}</>}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <MandatePanel
                    mandate={loan.mandate}
                    loanClosed={loan.status === 'CLOSED'}
                  />
                </Col>
              </Row>
            ),
          },
          {
            key: 'schedule',
            label: (
              <span>
                <CalendarOutlined /> EMI Schedule
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '8px 10px' } }}>
                <Table<EmiRow>
                  dataSource={loan.schedule}
                  columns={emiCols}
                  rowKey="seq"
                  size="small"
                  pagination={{ pageSize: 12, showTotal: (t) => `${t} instalments` }}
                  scroll={{ x: 860 }}
                />
              </Card>
            ),
          },
          {
            key: 'repayments',
            label: (
              <span>
                <HistoryOutlined /> Repayment History
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '8px 10px' } }}>
                <Table<Repayment>
                  dataSource={loanRepayments}
                  columns={rptCols}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `${t} transactions` }}
                  scroll={{ x: 840 }}
                />
              </Card>
            ),
          },
          {
            key: 'charges',
            label: (
              <span>
                <DollarOutlined /> Charges
              </span>
            ),
            children: (
              <Card style={panel} styles={{ body: { padding: '8px 10px' } }}>
                <Table<LoanCharge>
                  dataSource={loanCharges}
                  columns={chgCols}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 700 }}
                />
              </Card>
            ),
          },
          {
            key: 'documents',
            label: (
              <span>
                <FileProtectOutlined /> Documents
              </span>
            ),
            children: app ? (
              <DocumentsTab app={app} />
            ) : (
              <Card style={panel}>
                <div style={{ color: 'var(--ink-400)', padding: 20 }}>
                  Source application not available.
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* record payment modal */}
      <Modal
        title={
          <span>
            <DollarOutlined style={{ color: 'var(--status-success-fg)', marginRight: 8 }} />
            Record Payment — {loan.loanNumber}
          </span>
        }
        open={payModal}
        onCancel={() => setPayModal(false)}
        okText="Post Payment"
        onOk={() => {
          if (payAmount <= 0) {
            message.error('Enter a valid amount');
            return;
          }
          recordPayment(loan.loanNumber, payAmount, payMode, { name: user.name, role: user.role });
          setPayModal(false);
          message.success(`${inr(payAmount)} posted against ${loan.loanNumber}`);
        }}
      >
        <InfoGrid cols={2}>
          <InfoItem label="EMI" value={<span className="tnum">{inr(loan.emi)}</span>} />
          <InfoItem
            label="Total Due"
            value={<span className="tnum u-danger u-semibold">{inr(dueAmount)}</span>}
          />
        </InfoGrid>
        <div
          style={{
            marginTop: 16,
            marginBottom: 6,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink-600)',
          }}
        >
          Amount Received
        </div>
        <InputNumber
          style={{ width: '100%' }}
          min={100}
          value={payAmount}
          onChange={(v) => setPayAmount(v ?? 0)}
          formatter={(v) => `₹ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => Number(v?.replace(/[₹\s,]/g, '') ?? 0) as any}
        />
        <div
          style={{
            marginTop: 14,
            marginBottom: 6,
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ink-600)',
          }}
        >
          Payment Mode
        </div>
        <Select
          value={payMode}
          onChange={setPayMode}
          style={{ width: '100%' }}
          options={(['UPI', 'CASH', 'NEFT', 'CHEQUE', 'E-MANDATE'] as Repayment['mode'][]).map(
            (m) => ({ value: m, label: m }),
          )}
        />
      </Modal>
    </div>
  );
};

export default LoanDetails;

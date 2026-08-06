import React, { useMemo } from 'react';
import { Avatar, Button, Card, Col, Result, Row, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  PhoneOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useApplications } from '../../hooks/useApplications';
import { useLoanBook } from '../../hooks/useLms';
import { PageLoader } from '../../components/StateViews';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import { MigratedTag } from '../../components/MigratedTag';
import { MetricBand } from '../../components/KpiCard';
import PageHeader from '../../components/PageHeader';
import { fmtDate, initials, inr } from '../../utils/format';
import type { LoanAccount, LoanApplication } from '../../types';

const panel: React.CSSProperties = {};
const panelBody = { body: { padding: '20px 22px' } };

const CustomerDetails: React.FC = () => {
  const { mobile } = useParams<{ mobile: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { applications, loading: appsLoading } = useApplications();
  const { loans, loading: loansLoading } = useLoanBook();
  const scope = scopedLoanType(user.role);

  const apps = useMemo(
    () =>
      applications.filter((a) => a.customer.mobile === mobile && (!scope || a.loanType === scope)),
    [applications, mobile, scope],
  );
  const custLoans = useMemo(
    () => loans.filter((l) => l.mobile === mobile && (!scope || l.loanType === scope)),
    [loans, mobile, scope],
  );

  const customer = useMemo(() => {
    const latest = [...apps].sort(
      (a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf(),
    )[0];
    return latest?.customer;
  }, [apps]);

  if ((appsLoading || loansLoading) && !customer) {
    return <PageLoader />;
  }

  if (!customer) {
    return (
      <Result
        status="404"
        title="Customer not found"
        extra={
          <Button type="primary" onClick={() => navigate('/customers')}>
            Back to Customers
          </Button>
        }
      />
    );
  }

  const kyc = apps[0]?.kyc;
  /* Any legacy-book account makes this a migrated customer — their pre-platform
     history lives in the old system, which changes how a query about it is
     answered. Show the origin when there is exactly one, so staff get the
     legacy reference without opening the loan. */
  const migratedLoans = custLoans.filter((l) => l.migratedFrom);
  const totalRequested = apps.reduce((s, a) => s + a.loan.amount, 0);
  const liveBook = custLoans
    .filter((l) => l.status !== 'CLOSED')
    .reduce((s, l) => s + l.outstandingPrincipal, 0);

  const appCols: TableProps<LoanApplication>['columns'] = [
    {
      title: 'Application',
      dataIndex: 'appNumber',
      render: (v: string) => <span className="u-semibold u-accent u-sm">{v}</span>,
    },
    {
      title: 'Product',
      dataIndex: 'loanType',
      width: 120,
      render: (t) => <LoanTypeTag type={t} />,
    },
    {
      title: 'Amount',
      dataIndex: ['loan', 'amount'],
      align: 'right',
      width: 130,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'Stage',
      dataIndex: 'status',
      width: 155,
      render: (s: string) => <StatusTag status={s} />,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => <span className="u-ink-500 u-sm">{fmtDate(v)}</span>,
    },
  ];

  const loanCols: TableProps<LoanAccount>['columns'] = [
    {
      title: 'Loan Account',
      dataIndex: 'loanNumber',
      render: (v: string) => <span className="u-semibold u-success u-sm">{v}</span>,
    },
    {
      title: 'Product',
      dataIndex: 'loanType',
      width: 120,
      render: (t) => <LoanTypeTag type={t} />,
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstandingPrincipal',
      align: 'right',
      width: 140,
      render: (v: number) => <span className="tnum u-semibold">{inr(v)}</span>,
    },
    {
      title: 'EMI',
      dataIndex: 'emi',
      align: 'right',
      width: 120,
      render: (v: number) => <span className="tnum">{inr(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <StatusTag status={s} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            +91 {customer.mobile} · {customer.email}
            {migratedLoans.length > 0 && (
              <MigratedTag
                origin={migratedLoans.length === 1 ? migratedLoans[0]!.migratedFrom : undefined}
                count={migratedLoans.length}
              />
            )}
          </span>
        }
        back={
          <Button
            shape="circle"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/customers')}
          />
        }
      />

      <MetricBand
        metrics={[
          { label: 'Applications', value: apps.length, sub: 'lifetime' },
          {
            label: 'Live Loans',
            value: custLoans.filter((l) => l.status !== 'CLOSED').length,
            sub: `${custLoans.length} total`,
          },
          { label: 'Total Requested', value: inr(totalRequested), sub: 'across applications' },
          { label: 'Live Book', value: inr(liveBook), sub: 'outstanding principal' },
        ]}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card style={panel} styles={panelBody}>
            <SectionTitle>
              <UserOutlined /> Profile
            </SectionTitle>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <Avatar
                size={52}
                style={{
                  background: 'var(--accent-wash)',
                  color: 'var(--accent)',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {initials(customer.name)}
              </Avatar>
              <div>
                <div className="u-semibold u-lg u-ink-900">{customer.name}</div>
                <div className="u-sm u-ink-400">
                  {customer.gender} · {customer.age} yrs · {customer.maritalStatus}
                </div>
              </div>
            </div>
            <InfoGrid cols={2}>
              <InfoItem label="Date of Birth" value={`${fmtDate(customer.dob)}`} />
              <InfoItem label="Father / Spouse" value={customer.fatherOrSpouseName} />
              <InfoItem label="Dependents" value={customer.dependents} />
              <InfoItem
                label="Alternate Mobile"
                value={customer.altMobile ? `+91 ${customer.altMobile}` : '—'}
              />
              <InfoItem
                label="Mobile"
                value={
                  <span>
                    <PhoneOutlined style={{ marginRight: 6, color: 'var(--status-success-fg)' }} />
                    +91 {customer.mobile}
                  </span>
                }
              />
              <InfoItem label="Email" value={customer.email} />
            </InfoGrid>
          </Card>

          <Card style={{ ...panel, marginTop: 16 }} styles={panelBody}>
            <SectionTitle>
              <EnvironmentOutlined /> Addresses
            </SectionTitle>
            <InfoGrid cols={1}>
              <InfoItem
                label="Current Address"
                value={`${customer.currentAddress.line1}, ${customer.currentAddress.city}, ${customer.currentAddress.state} — ${customer.currentAddress.pincode}`}
              />
              <InfoItem
                label="Permanent Address"
                value={`${customer.permanentAddress.line1}, ${customer.permanentAddress.city}, ${customer.permanentAddress.state} — ${customer.permanentAddress.pincode}`}
              />
            </InfoGrid>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {kyc && (
            <Card style={panel} styles={panelBody}>
              <SectionTitle>
                <IdcardOutlined /> KYC Status
              </SectionTitle>
              <InfoGrid cols={2}>
                <InfoItem
                  label="Aadhaar"
                  value={
                    <span>
                      {kyc.aadhaarMasked}{' '}
                      <StatusTag status={kyc.aadhaarVerified ? 'VERIFIED' : 'PENDING'} />
                    </span>
                  }
                />
                <InfoItem
                  label="PAN"
                  value={
                    <span>
                      {kyc.panNumber}{' '}
                      <StatusTag status={kyc.panVerified ? 'VERIFIED' : 'PENDING'} />
                    </span>
                  }
                />
                <InfoItem label="Video KYC" value={<StatusTag status={kyc.videoKycStatus} />} />
                <InfoItem label="CKYC" value={kyc.ckycNumber ?? 'Not available'} />
              </InfoGrid>
            </Card>
          )}
          <Card style={{ ...panel, marginTop: kyc ? 16 : 0 }} styles={panelBody}>
            <SectionTitle>
              <CreditCardOutlined /> Employment &amp; Income
            </SectionTitle>
            <InfoGrid cols={2}>
              <InfoItem label="Type" value={customer.employment.type} />
              <InfoItem label="Employer" value={customer.employment.employer} />
              <InfoItem
                label="Monthly Income"
                value={
                  <span className="tnum u-semibold">{inr(customer.income.monthlyIncome)}</span>
                }
              />
              <InfoItem
                label="FOIR"
                value={
                  <span
                    style={{
                      fontWeight: 700,
                      color:
                        customer.income.foir <= 55
                          ? 'var(--status-success-fg)'
                          : 'var(--status-danger-fg)',
                    }}
                  >
                    {customer.income.foir}%
                  </span>
                }
              />
            </InfoGrid>
          </Card>
        </Col>
      </Row>

      <Card
        style={{ ...panel, marginTop: 16 }}
        styles={{ body: { padding: '8px 10px' } }}
        title={<span className="u-base u-semibold">Applications</span>}
      >
        <Table<LoanApplication>
          dataSource={apps}
          columns={appCols}
          rowKey="id"
          size="small"
          pagination={false}
          className="row-link"
          onRow={(r) => ({ onClick: () => navigate(`/applications/view/${r.id}`) })}
        />
      </Card>

      {custLoans.length > 0 && (
        <Card
          style={{ ...panel, marginTop: 16 }}
          styles={{ body: { padding: '8px 10px' } }}
          title={<span className="u-base u-semibold">Loan Accounts</span>}
        >
          <Table<LoanAccount>
            dataSource={custLoans}
            columns={loanCols}
            rowKey="loanNumber"
            size="small"
            pagination={false}
            className="row-link"
            onRow={(r) => ({ onClick: () => navigate(`/lms/accounts/${r.loanNumber}`) })}
          />
        </Card>
      )}
    </div>
  );
};

export default CustomerDetails;

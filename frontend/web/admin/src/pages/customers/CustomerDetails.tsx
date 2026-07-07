import React, { useMemo } from 'react';
import { Avatar, Button, Card, Col, Result, Row, Table } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined, CreditCardOutlined, EnvironmentOutlined, IdcardOutlined,
  PhoneOutlined, ShopOutlined, UserOutlined, WalletOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { scopedLoanType } from '../../auth/rbac';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { LoanTypeTag, StatusTag } from '../../components/StatusTag';
import KpiCard from '../../components/KpiCard';
import PageHeader from '../../components/PageHeader';
import { fmtDate, initials, inr } from '../../utils/format';
import type { LoanAccount, LoanApplication } from '../../types';

const panel: React.CSSProperties = { border: '1px solid #e7ebf3' };
const panelBody = { body: { padding: '20px 22px' } };

const CustomerDetails: React.FC = () => {
  const { mobile } = useParams<{ mobile: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const applications = useAppStore((s) => s.applications);
  const loans = useAppStore((s) => s.loans);
  const scope = scopedLoanType(user.role);

  const apps = useMemo(
    () => applications.filter((a) => a.customer.mobile === mobile && (!scope || a.loanType === scope)),
    [applications, mobile, scope],
  );
  const custLoans = useMemo(
    () => loans.filter((l) => l.mobile === mobile && (!scope || l.loanType === scope)),
    [loans, mobile, scope],
  );

  const customer = useMemo(() => {
    const latest = [...apps].sort((a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf())[0];
    return latest?.customer;
  }, [apps]);

  if (!customer) {
    return <Result status="404" title="Customer not found" extra={<Button type="primary" onClick={() => navigate('/customers')}>Back to Customers</Button>} />;
  }

  const kyc = apps[0]?.kyc;
  const totalRequested = apps.reduce((s, a) => s + a.loan.amount, 0);
  const liveBook = custLoans.filter((l) => l.status !== 'CLOSED').reduce((s, l) => s + l.outstandingPrincipal, 0);

  const appCols: TableProps<LoanApplication>['columns'] = [
    { title: 'Application', dataIndex: 'appNumber', render: (v: string) => <span style={{ fontWeight: 600, color: '#0284c7', fontSize: 12.5 }}>{v}</span> },
    { title: 'Product', dataIndex: 'loanType', width: 120, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Amount', dataIndex: ['loan', 'amount'], align: 'right', width: 130, render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span> },
    { title: 'Stage', dataIndex: 'status', width: 155, render: (s: string) => <StatusTag status={s} /> },
    { title: 'Created', dataIndex: 'createdAt', width: 120, render: (v: string) => <span style={{ color: '#64748b', fontSize: 12.5 }}>{fmtDate(v)}</span> },
  ];

  const loanCols: TableProps<LoanAccount>['columns'] = [
    { title: 'Loan Account', dataIndex: 'loanNumber', render: (v: string) => <span style={{ fontWeight: 600, color: '#0f766e', fontSize: 12.5 }}>{v}</span> },
    { title: 'Product', dataIndex: 'loanType', width: 120, render: (t) => <LoanTypeTag type={t} /> },
    { title: 'Outstanding', dataIndex: 'outstandingPrincipal', align: 'right', width: 140, render: (v: number) => <span className="tnum" style={{ fontWeight: 600 }}>{inr(v)}</span> },
    { title: 'EMI', dataIndex: 'emi', align: 'right', width: 120, render: (v: number) => <span className="tnum">{inr(v)}</span> },
    { title: 'Status', dataIndex: 'status', width: 120, render: (s: string) => <StatusTag status={s} /> },
  ];

  return (
    <div>
      <PageHeader
        title={customer.name}
        subtitle={<span>+91 {customer.mobile} · {customer.email}</span>}
        back={<Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} />}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Applications" value={apps.length} sub="lifetime" icon={<UserOutlined />} tint="#0284c7" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Live Loans" value={custLoans.filter((l) => l.status !== 'CLOSED').length} sub={`${custLoans.length} total`} icon={<WalletOutlined />} tint="#0f766e" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Total Requested" value={inr(totalRequested)} sub="across applications" icon={<CreditCardOutlined />} tint="#b45309" /></Col>
        <Col xs={24} sm={12} xl={6}><KpiCard label="Live Book" value={inr(liveBook)} sub="outstanding principal" icon={<ShopOutlined />} tint="#6d4ea8" /></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card variant="borderless" style={panel} styles={panelBody}>
            <SectionTitle><UserOutlined /> Profile</SectionTitle>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <Avatar size={52} style={{ background: '#e0f2fe', color: '#0284c7', fontWeight: 700, fontSize: 18 }}>{initials(customer.name)}</Avatar>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{customer.name}</div>
                <div style={{ fontSize: 12.5, color: '#7c8aa3' }}>{customer.gender} · {customer.age} yrs · {customer.maritalStatus}</div>
              </div>
            </div>
            <InfoGrid cols={2}>
              <InfoItem label="Date of Birth" value={`${fmtDate(customer.dob)}`} />
              <InfoItem label="Father / Spouse" value={customer.fatherOrSpouseName} />
              <InfoItem label="Dependents" value={customer.dependents} />
              <InfoItem label="Alternate Mobile" value={customer.altMobile ? `+91 ${customer.altMobile}` : '—'} />
              <InfoItem label="Mobile" value={<span><PhoneOutlined style={{ marginRight: 6, color: '#16a34a' }} />+91 {customer.mobile}</span>} />
              <InfoItem label="Email" value={customer.email} />
            </InfoGrid>
          </Card>

          <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
            <SectionTitle><EnvironmentOutlined /> Addresses</SectionTitle>
            <InfoGrid cols={1}>
              <InfoItem label="Current Address" value={`${customer.currentAddress.line1}, ${customer.currentAddress.city}, ${customer.currentAddress.state} — ${customer.currentAddress.pincode}`} />
              <InfoItem label="Permanent Address" value={`${customer.permanentAddress.line1}, ${customer.permanentAddress.city}, ${customer.permanentAddress.state} — ${customer.permanentAddress.pincode}`} />
            </InfoGrid>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          {kyc && (
            <Card variant="borderless" style={panel} styles={panelBody}>
              <SectionTitle><IdcardOutlined /> KYC Status</SectionTitle>
              <InfoGrid cols={2}>
                <InfoItem label="Aadhaar" value={<span>{kyc.aadhaarMasked} <StatusTag status={kyc.aadhaarVerified ? 'VERIFIED' : 'PENDING'} /></span>} />
                <InfoItem label="PAN" value={<span>{kyc.panNumber} <StatusTag status={kyc.panVerified ? 'VERIFIED' : 'PENDING'} /></span>} />
                <InfoItem label="Video KYC" value={<StatusTag status={kyc.videoKycStatus} />} />
                <InfoItem label="CKYC" value={kyc.ckycNumber ?? 'Not available'} />
              </InfoGrid>
            </Card>
          )}
          <Card variant="borderless" style={{ ...panel, marginTop: kyc ? 16 : 0 }} styles={panelBody}>
            <SectionTitle><CreditCardOutlined /> Employment &amp; Income</SectionTitle>
            <InfoGrid cols={2}>
              <InfoItem label="Type" value={customer.employment.type} />
              <InfoItem label="Employer" value={customer.employment.employer} />
              <InfoItem label="Monthly Income" value={<span className="tnum" style={{ fontWeight: 700 }}>{inr(customer.income.monthlyIncome)}</span>} />
              <InfoItem label="FOIR" value={<span style={{ fontWeight: 700, color: customer.income.foir <= 55 ? '#16a34a' : '#dc2626' }}>{customer.income.foir}%</span>} />
            </InfoGrid>
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 13.5, fontWeight: 600 }}>Applications</span>}>
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
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 13.5, fontWeight: 600 }}>Loan Accounts</span>}>
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

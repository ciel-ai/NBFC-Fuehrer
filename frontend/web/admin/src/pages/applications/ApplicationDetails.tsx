import React, { useState } from 'react';
import { App, Avatar, Button, Card, Result, Tabs, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  AuditOutlined,
  BankOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  SafetyCertificateOutlined,
  SnippetsOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useApplicationDetail } from '../../hooks/useApplications';
import { PageLoader } from '../../components/StateViews';
import { useAuthStore } from '../../store/authStore';
import { ROLE_META, scopedLoanType, isAdmin } from '../../auth/rbac';
import { LoanTypeTag, RiskGradeTag, StatusTag } from '../../components/StatusTag';
import { fmtTimeAgo, initials, inr } from '../../utils/format';
import {
  AuditTab,
  BureauTab,
  CustomerTab,
  DocumentsTab,
  KycTab,
  LoanTab,
  OverviewTab,
  TimelineTab,
} from './tabs';
import CreditDecisionDrawer from './CreditDecisionDrawer';
import FinancePanel from './FinancePanel';
import CamDocument from './CamDocument';

const ApplicationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useAuthStore((s) => s.user)!;
  const pickForReview = useAppStore((s) => s.pickForReview);

  const { app, live, loading } = useApplicationDetail(id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const meta = ROLE_META[user.role];
  const scope = scopedLoanType(user.role);

  if (loading && !app) {
    return <PageLoader />;
  }

  if (!app) {
    return (
      <Result
        status="404"
        title="Application not found"
        extra={
          <Button type="primary" onClick={() => navigate('/applications')}>
            Back to Applications
          </Button>
        }
      />
    );
  }
  if (scope && app.loanType !== scope) {
    return (
      <Result
        status="403"
        title="Outside your portfolio"
        subTitle={`This application belongs to the ${app.loanType} vertical.`}
        extra={
          <Button type="primary" onClick={() => navigate('/applications')}>
            Back
          </Button>
        }
      />
    );
  }

  const canCredit = isAdmin(user.role) || meta.family === 'CREDIT';
  const canFinance = isAdmin(user.role) || meta.family === 'FINANCE';
  const inFinanceFlow = [
    'CREDIT_APPROVED',
    'FINANCE_PENDING',
    'EMANDATE_PENDING',
    'DISBURSED',
    'ACTIVE',
    'CLOSED',
  ].includes(app.status);

  const headerActions: React.ReactNode[] = [];
  if (canCredit && app.status === 'SUBMITTED') {
    headerActions.push(
      <Button
        key="pick"
        type="primary"
        icon={<SafetyCertificateOutlined />}
        onClick={() => {
          pickForReview(app.id, { name: user.name, role: user.role });
          message.success('Moved to credit review queue');
        }}
      >
        Pick for Review
      </Button>,
    );
  }
  if (canCredit && app.status === 'CREDIT_PENDING') {
    headerActions.push(
      <Button
        key="decide"
        type="primary"
        icon={<SafetyCertificateOutlined />}
        onClick={() => setDrawerOpen(true)}
      >
        Credit Decision
      </Button>,
    );
  }
  if (app.loanNumber) {
    headerActions.push(
      <Button
        key="lms"
        icon={<WalletOutlined />}
        onClick={() => navigate(`/lms/accounts/${app.loanNumber}`)}
      >
        Loan Account
      </Button>,
    );
  }

  return (
    <div>
      {/* ── sticky application header ── */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '18px 22px' } }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
            <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
            <Avatar
              size={52}
              style={{ background: 'var(--accent)', fontWeight: 600, fontSize: 17, minWidth: 52 }}
            >
              {initials(app.customer.name)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-900)' }}>
                  {app.customer.name}
                </span>
                <StatusTag status={app.status} size="md" />
                {live && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      fontSize: 10.5,
                      color: 'var(--status-success-fg)',
                      background: 'var(--status-success-tint)',
                      borderColor: 'var(--status-success-tint)',
                    }}
                  >
                    LIVE
                  </Tag>
                )}
                <LoanTypeTag type={app.loanType} full />
                {app.creditDecision && <RiskGradeTag grade={app.creditDecision.riskGrade} />}
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
                <span className="u-semibold u-accent">{app.appNumber}</span>
                <span>+91 {app.customer.mobile}</span>
                <span>{app.branch}</span>
                <span>Updated {fmtTimeAgo(app.updatedAt)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
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
                {app.creditDecision?.decision === 'APPROVED'
                  ? 'Sanctioned Amount'
                  : 'Requested Amount'}
              </div>
              <div
                className="tnum"
                style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-900)' }}
              >
                {inr(app.creditDecision?.approvedAmount ?? app.loan.amount)}
              </div>
              <div className="u-xs u-ink-400">
                {app.loan.tenureMonths} months · EMI{' '}
                <span className="tnum">{inr(app.loan.emi)}</span>
              </div>
            </div>
            {headerActions.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>{headerActions}</div>
            )}
          </div>
        </div>
      </Card>

      {/* finance workflow panel */}
      {inFinanceFlow && (canFinance || ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(app.status)) && (
        <FinancePanel app={app} readonly={!canFinance} />
      )}

      {app.status === 'CREDIT_RETURNED' && (
        <Card
          style={{
            border: '1px solid var(--status-violet-tint)',
            background: 'var(--ink-50)',
            marginBottom: 16,
          }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <span className="u-violet u-semibold u-base">
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            Returned to sales — {app.creditDecision?.reason}.
          </span>
          <span style={{ color: 'var(--status-violet-fg)', fontSize: 12.5, marginLeft: 8 }}>
            The agent will rectify and resubmit from the mobile app.
          </span>
        </Card>
      )}

      <Tabs
        defaultActiveKey="overview"
        size="middle"
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <FileTextOutlined /> Overview
              </span>
            ),
            children: <OverviewTab app={app} />,
          },
          {
            key: 'customer',
            label: (
              <span>
                <UserOutlined /> Customer Details
              </span>
            ),
            children: <CustomerTab app={app} />,
          },
          {
            key: 'kyc',
            label: (
              <span>
                <IdcardOutlined /> KYC
              </span>
            ),
            children: <KycTab app={app} />,
          },
          {
            key: 'documents',
            label: (
              <span>
                <FileProtectOutlined /> Documents{' '}
                <Tag style={{ marginLeft: 4, borderRadius: 999, fontSize: 10.5 }}>
                  {app.documents.length}
                </Tag>
              </span>
            ),
            children: <DocumentsTab app={app} />,
          },
          {
            key: 'bureau',
            label: (
              <span>
                <SolutionOutlined /> Bureau Report
              </span>
            ),
            children: <BureauTab app={app} />,
          },
          {
            key: 'loan',
            label: (
              <span>
                <BankOutlined /> Loan Details
              </span>
            ),
            children: <LoanTab app={app} />,
          },
          {
            key: 'cam',
            label: (
              <span>
                <SnippetsOutlined /> CAM
              </span>
            ),
            children: <CamDocument app={app} />,
          },
          {
            key: 'timeline',
            label: (
              <span>
                <HistoryOutlined /> Timeline
              </span>
            ),
            children: <TimelineTab app={app} />,
          },
          {
            key: 'audit',
            label: (
              <span>
                <AuditOutlined /> Audit Trail
              </span>
            ),
            children: <AuditTab app={app} />,
          },
        ]}
      />

      <CreditDecisionDrawer app={app} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default ApplicationDetails;

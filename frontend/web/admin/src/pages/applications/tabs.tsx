import React, { useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Modal, Progress, Row, Table, Tag, Timeline, Tooltip } from 'antd';
import type { TableProps } from 'antd';
import {
  BankOutlined, CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, CreditCardOutlined,
  EnvironmentOutlined, EyeOutlined, FileImageOutlined, FilePdfOutlined, FileProtectOutlined,
  GoldOutlined, HomeOutlined, IdcardOutlined, MailOutlined, PhoneOutlined,
  SafetyCertificateOutlined, ShopOutlined, TeamOutlined, UserOutlined, VideoCameraOutlined,
  WalletOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { RiskGradeTag, StatusTag, scoreColor } from '../../components/StatusTag';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import { useAppStore } from '../../store/appStore';
import type { AppDocument, AuditLog, BureauAccount, LoanApplication } from '../../types';

const panel: React.CSSProperties = { border: '1px solid #e7ebf3' };
const panelBody = { body: { padding: '20px 22px' } };

// ════ OVERVIEW ════
export const OverviewTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const docsVerified = app.documents.filter((d) => d.status === 'VERIFIED').length;
  const checks = [
    { label: 'Aadhaar e-KYC', ok: app.kyc.aadhaarVerified },
    { label: 'PAN Verification', ok: app.kyc.panVerified },
    { label: 'Video KYC', ok: app.kyc.videoKycStatus === 'COMPLETED' },
    { label: `Documents (${docsVerified}/${app.documents.length})`, ok: docsVerified === app.documents.length },
    { label: `Bureau Score ${app.bureau.score}`, ok: app.bureau.score >= 650 },
    { label: `FOIR ${app.customer.income.foir}%`, ok: app.customer.income.foir <= 55 },
  ];
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle><WalletOutlined /> Loan Request</SectionTitle>
          <InfoGrid cols={3}>
            <InfoItem label="Requested Amount" value={<span className="tnum" style={{ fontSize: 16, fontWeight: 700 }}>{inr(app.loan.amount)}</span>} />
            <InfoItem label="Tenure" value={`${app.loan.tenureMonths} months`} />
            <InfoItem label="Interest Rate" value={`${app.loan.interestRate}% p.a.`} />
            <InfoItem label="Indicative EMI" value={<span className="tnum">{inr(app.loan.emi)}/month</span>} />
            <InfoItem label="Purpose" value={app.loan.purpose} />
            <InfoItem label="Scheme" value={app.loan.scheme} />
          </InfoGrid>
        </Card>
        {app.creditDecision && (
          <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
            <SectionTitle><SafetyCertificateOutlined /> Credit Decision</SectionTitle>
            <InfoGrid cols={3}>
              <InfoItem label="Decision" value={<StatusTag status={app.creditDecision.decision} size="md" />} />
              <InfoItem label="Risk Grade" value={<RiskGradeTag grade={app.creditDecision.riskGrade} />} />
              <InfoItem label="Decided By" value={`${app.creditDecision.decidedBy} · ${fmtDateTime(app.creditDecision.decidedAt)}`} />
              {app.creditDecision.decision === 'APPROVED' && (
                <>
                  <InfoItem label="Approved Amount" value={<span className="tnum" style={{ fontWeight: 700, color: '#047857' }}>{inr(app.creditDecision.approvedAmount ?? app.loan.amount)}</span>} />
                  <InfoItem label="Approved Terms" value={`${app.creditDecision.approvedTenure} months @ ${app.creditDecision.approvedRate}%`} />
                </>
              )}
              {app.creditDecision.reason && <InfoItem label="Reason" value={app.creditDecision.reason} />}
              <InfoItem label="Remarks" value={app.creditDecision.remarks} span={3} />
            </InfoGrid>
          </Card>
        )}
        {app.finance?.disbursement && (
          <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
            <SectionTitle><BankOutlined /> Disbursement</SectionTitle>
            <InfoGrid cols={3}>
              <InfoItem label="Net Disbursed" value={<span className="tnum" style={{ fontWeight: 700, color: '#0f766e' }}>{inr(app.finance.disbursement.amount)}</span>} />
              <InfoItem label="Mode / UTR" value={`${app.finance.disbursement.mode} · ${app.finance.disbursement.utr}`} />
              <InfoItem label="Date" value={fmtDateTime(app.finance.disbursement.date)} />
              <InfoItem label="Loan Account" value={<span style={{ fontWeight: 600, color: '#2563eb' }}>{app.loanNumber}</span>} />
              <InfoItem label="Processed By" value={app.finance.disbursement.processedBy} />
            </InfoGrid>
          </Card>
        )}
      </Col>
      <Col xs={24} lg={10}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle><FileProtectOutlined /> Verification Checklist</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checks.map((c) => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: c.ok ? '#f6fdf9' : '#fff8f1', border: `1px solid ${c.ok ? '#d3f2e1' : '#fde9d2'}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{c.label}</span>
                {c.ok
                  ? <CheckCircleFilled style={{ color: '#16a34a', fontSize: 16 }} />
                  : <CloseCircleFilled style={{ color: '#ea580c', fontSize: 16 }} />}
              </div>
            ))}
          </div>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
          <SectionTitle><TeamOutlined /> Sourcing</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Channel" value={app.source} />
            <InfoItem label="Branch" value={app.branch} />
            <InfoItem label="Sales Agent" value={`${app.createdBy} (${app.createdByCode})`} />
            <InfoItem label="Submitted On" value={fmtDateTime(app.createdAt)} />
          </InfoGrid>
        </Card>
      </Col>
    </Row>
  );
};

// ════ CUSTOMER ════
export const CustomerTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const c = app.customer;
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle><UserOutlined /> Personal Information</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Full Name" value={c.name} />
            <InfoItem label="Date of Birth" value={`${fmtDate(c.dob)} (${c.age} yrs)`} />
            <InfoItem label="Gender" value={c.gender} />
            <InfoItem label="Marital Status" value={c.maritalStatus} />
            <InfoItem label="Father / Spouse" value={c.fatherOrSpouseName} />
            <InfoItem label="Dependents" value={c.dependents} />
          </InfoGrid>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
          <SectionTitle><PhoneOutlined /> Contact Information</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Mobile" value={<span><PhoneOutlined style={{ color: '#16a34a', marginRight: 6 }} />+91 {c.mobile}</span>} />
            <InfoItem label="Alternate Mobile" value={c.altMobile ? `+91 ${c.altMobile}` : '—'} />
            <InfoItem label="Email" value={<span><MailOutlined style={{ color: '#2563eb', marginRight: 6 }} />{c.email}</span>} span={2} />
          </InfoGrid>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
          <SectionTitle><EnvironmentOutlined /> Addresses</SectionTitle>
          <InfoGrid cols={1}>
            <InfoItem
              label={`Current Address · ${c.currentAddress.residenceType} · ${c.currentAddress.yearsAtAddress} yrs`}
              value={`${c.currentAddress.line1}, ${c.currentAddress.line2}, ${c.currentAddress.city}, ${c.currentAddress.state} — ${c.currentAddress.pincode}`}
            />
            <InfoItem
              label="Permanent Address"
              value={`${c.permanentAddress.line1}, ${c.permanentAddress.line2}, ${c.permanentAddress.city}, ${c.permanentAddress.state} — ${c.permanentAddress.pincode}`}
            />
          </InfoGrid>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle><ShopOutlined /> Employment</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Type" value={<Tag color={c.employment.type === 'Salaried' ? 'blue' : 'purple'} style={{ borderRadius: 6 }}>{c.employment.type}</Tag>} />
            <InfoItem label="Employer / Business" value={c.employment.employer} />
            <InfoItem label="Designation" value={c.employment.designation} />
            <InfoItem label="Experience" value={`${c.employment.yearsInJob} years`} />
            {c.employment.officialEmail && <InfoItem label="Official Email" value={c.employment.officialEmail} span={2} />}
          </InfoGrid>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
          <SectionTitle><CreditCardOutlined /> Income Details</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Monthly Income" value={<span className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{inr(c.income.monthlyIncome)}</span>} />
            <InfoItem label="Other Income" value={<span className="tnum">{inr(c.income.otherIncome)}</span>} />
            <InfoItem label="Existing Obligations" value={<span className="tnum">{inr(c.income.existingObligations)}/month</span>} />
            <InfoItem label="Proposed EMI" value={<span className="tnum">{inr(app.loan.emi)}/month</span>} />
          </InfoGrid>
          <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 12, background: '#f8fafd', border: '1px solid #eef1f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>FOIR — Fixed Obligation to Income Ratio</span>
              <span className="tnum" style={{ fontSize: 13, fontWeight: 700, color: c.income.foir <= 55 ? '#16a34a' : '#dc2626' }}>{c.income.foir}%</span>
            </div>
            <Progress
              percent={c.income.foir}
              showInfo={false}
              strokeColor={c.income.foir <= 40 ? '#16a34a' : c.income.foir <= 55 ? '#d97706' : '#dc2626'}
              trailColor="#e8edf5"
            />
            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}>Policy ceiling: 55% · obligations + proposed EMI vs total income</div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

// ════ KYC ════
export const KycTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const k = app.kyc;
  const KycCard: React.FC<{ icon: React.ReactNode; title: string; value: string; verified: boolean; extra?: React.ReactNode; verifiedAt?: string }> = ({ icon, title, value, verified, extra, verifiedAt }) => (
    <Card variant="borderless" style={panel} styles={{ body: { padding: '18px 20px' } }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 12, background: verified ? '#ecfdf5' : '#fffbeb', color: verified ? '#047857' : '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{title}</span>
            <StatusTag status={verified ? 'VERIFIED' : 'PENDING'} />
          </div>
          <div className="tnum" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1, color: '#0f172a', marginTop: 6 }}>{value}</div>
          {extra && <div style={{ marginTop: 6 }}>{extra}</div>}
          {verifiedAt && <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 6 }}><ClockCircleOutlined style={{ marginRight: 5 }} />Verified {fmtDateTime(verifiedAt)}</div>}
        </div>
      </div>
    </Card>
  );
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <KycCard icon={<IdcardOutlined />} title="Aadhaar e-KYC (UIDAI)" value={k.aadhaarMasked} verified={k.aadhaarVerified} verifiedAt={k.aadhaarVerifiedAt}
          extra={<span style={{ fontSize: 12, color: '#64748b' }}>OTP-based e-KYC · demographic match successful</span>} />
      </Col>
      <Col xs={24} md={12}>
        <KycCard icon={<CreditCardOutlined />} title="PAN Verification (NSDL)" value={k.panNumber} verified={k.panVerified}
          extra={<span style={{ fontSize: 12, color: '#64748b' }}>Name match score: <strong>{k.panNameMatch}%</strong> · status: Individual, Valid</span>} />
      </Col>
      <Col xs={24} md={12}>
        <KycCard icon={<VideoCameraOutlined />} title="Video KYC" value={k.videoKycStatus === 'COMPLETED' ? 'Completed' : k.videoKycStatus === 'PENDING' ? 'Awaiting Session' : 'Not Required'} verified={k.videoKycStatus === 'COMPLETED'}
          extra={k.livenessScore ? <span style={{ fontSize: 12, color: '#64748b' }}>Liveness score: <strong>{k.livenessScore}/100</strong> · geo-tagged session recording stored</span> : undefined} />
      </Col>
      <Col xs={24} md={12}>
        <KycCard icon={<FileDoneOutlined />} title="CKYC Registry" value={k.ckycNumber ?? 'Not Available'} verified={!!k.ckycNumber}
          extra={<span style={{ fontSize: 12, color: '#64748b' }}>{k.ckycNumber ? 'Record fetched from CERSAI central registry' : 'Will be generated post-disbursal'}</span>} />
      </Col>
    </Row>
  );
};

// ════ DOCUMENTS ════
export const DocumentsTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const [preview, setPreview] = useState<AppDocument | null>(null);
  const groups = useMemo(() => {
    const cats = ['KYC', 'Income', 'Banking', 'Collateral', 'Other'] as const;
    return cats.map((cat) => ({ cat, docs: app.documents.filter((d) => d.category === cat) })).filter((g) => g.docs.length);
  }, [app.documents]);

  return (
    <div>
      {groups.map(({ cat, docs }) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <SectionTitle>{cat === 'KYC' ? <IdcardOutlined /> : cat === 'Income' ? <CreditCardOutlined /> : cat === 'Banking' ? <BankOutlined /> : cat === 'Collateral' ? <GoldOutlined /> : <FilePdfOutlined />} {cat} Documents</SectionTitle>
          <Row gutter={[14, 14]}>
            {docs.map((d) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={d.id}>
                <Card variant="borderless" style={panel} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 40, height: 40, minWidth: 40, borderRadius: 10, background: d.fileName.endsWith('.pdf') ? '#fef2f2' : '#e8f3fa', color: d.fileName.endsWith('.pdf') ? '#dc2626' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
                      {d.fileName.endsWith('.pdf') ? <FilePdfOutlined /> : <FileImageOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(d.sizeKB / 1024).toFixed(1)} MB · {fmtDate(d.uploadedAt)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <StatusTag status={d.status} />
                    <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setPreview(d)}>Preview</Button>
                  </div>
                  {d.remarks && <div style={{ marginTop: 8, fontSize: 11.5, color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: 8 }}>{d.remarks}</div>}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      <Modal open={!!preview} onCancel={() => setPreview(null)} footer={null} width={560} title={preview?.name}>
        <div style={{ height: 380, borderRadius: 12, background: 'repeating-linear-gradient(45deg, #f6f8fc, #f6f8fc 12px, #eef2f9 12px, #eef2f9 24px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, border: '1px dashed #cdd7e8' }}>
          {preview?.fileName.endsWith('.pdf') ? <FilePdfOutlined style={{ fontSize: 46, color: '#dc2626' }} /> : <FileImageOutlined style={{ fontSize: 46, color: '#2563eb' }} />}
          <div style={{ fontWeight: 600, color: '#475569' }}>{preview?.fileName}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Secure document preview · fetched from encrypted DMS store</div>
          {preview && <StatusTag status={preview.status} size="md" />}
        </div>
      </Modal>
    </div>
  );
};

// ════ BUREAU ════
const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const min = 300, max = 900;
  const frac = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const angle = Math.PI * (1 - frac);
  const r = 84, cx = 110, cy = 104;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  const largeArc = frac > 0.5 ? 1 : 0;
  const color = scoreColor(score);
  return (
    <svg width={220} height={128} viewBox="0 0 220 128">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e8edf5" strokeWidth={15} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}`} fill="none" stroke={color} strokeWidth={15} strokeLinecap="round" />
      <text x={cx} y={cy - 18} textAnchor="middle" fontSize={30} fontWeight={800} fill="#0f172a" className="tnum">{score}</text>
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11.5} fill="#94a3b8">CIBIL Score · {score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : 'Poor'}</text>
      <text x={cx - r} y={cy + 18} textAnchor="middle" fontSize={10} fill="#b6c2d6">300</text>
      <text x={cx + r} y={cy + 18} textAnchor="middle" fontSize={10} fill="#b6c2d6">900</text>
    </svg>
  );
};

export const BureauTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const b = app.bureau;
  const cols: TableProps<BureauAccount>['columns'] = [
    { title: 'Lender', dataIndex: 'lender', render: (v: string) => <span style={{ fontWeight: 600, color: '#1e293b' }}>{v}</span> },
    { title: 'Account Type', dataIndex: 'type' },
    { title: 'Sanctioned', dataIndex: 'sanctioned', align: 'right', render: (v: number) => <span className="tnum">{inr(v)}</span> },
    { title: 'Outstanding', dataIndex: 'outstanding', align: 'right', render: (v: number) => <span className="tnum">{inr(v)}</span> },
    { title: 'Opened', dataIndex: 'openedOn', render: (v: string) => fmtDate(v) },
    {
      title: 'Status', dataIndex: 'status',
      render: (s: string) => <StatusTag status={s === 'Active' ? 'ACTIVE' : s === 'Closed' ? 'CLOSED' : 'REJECTED'} />,
    },
  ];
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card variant="borderless" style={panel} styles={{ body: { padding: '20px 22px', textAlign: 'center' } }}>
          <SectionTitle style={{ justifyContent: 'center' }}>Bureau Score</SectionTitle>
          <ScoreGauge score={b.score} />
          <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Report pulled {fmtDate(b.reportDate)} · TransUnion CIBIL</div>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={panelBody}>
          <SectionTitle>Summary</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Total Accounts" value={b.totalAccounts} />
            <InfoItem label="Active Accounts" value={b.activeAccounts} />
            <InfoItem label="Overdue Accounts" value={<span style={{ color: b.overdueAccounts ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{b.overdueAccounts}</span>} />
            <InfoItem label="Enquiries (6m)" value={b.enquiries6m} />
            <InfoItem label="Oldest Account" value={`${b.oldestAccountYears} years`} />
          </InfoGrid>
        </Card>
      </Col>
      <Col xs={24} lg={16}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle>Payment History — last 24 months</SectionTitle>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
            {b.paymentHistory.map((p, i) => (
              <Tooltip key={i} title={`${dayjs().subtract(i, 'month').format('MMM YY')} — ${p === 'ON_TIME' ? 'Paid on time' : p === 'DELAYED' ? 'Paid late' : 'Missed'}`}>
                <span className="ph-cell" style={{ background: p === 'ON_TIME' ? '#86efac' : p === 'DELAYED' ? '#fcd34d' : '#fca5a5' }} />
              </Tooltip>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: '#7c8aa3' }}>
            <span><span className="ph-cell" style={{ background: '#86efac', width: 10, height: 10, marginRight: 5 }} />On-time</span>
            <span><span className="ph-cell" style={{ background: '#fcd34d', width: 10, height: 10, marginRight: 5 }} />Delayed</span>
            <span><span className="ph-cell" style={{ background: '#fca5a5', width: 10, height: 10, marginRight: 5 }} />Missed</span>
            <span style={{ marginLeft: 'auto' }}>Most recent month first</span>
          </div>
        </Card>
        <Card variant="borderless" style={{ ...panel, marginTop: 16 }} styles={{ body: { padding: '8px 10px' } }} title={<span style={{ fontSize: 13.5, fontWeight: 600 }}>Tradelines Reported</span>}>
          <Table<BureauAccount> dataSource={b.accounts} columns={cols} rowKey={(r) => `${r.lender}-${r.openedOn}`} size="small" pagination={false} />
        </Card>
      </Col>
    </Row>
  );
};

// ════ LOAN DETAILS ════
export const LoanTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const gold = app.collateral?.gold;
  const property = app.collateral?.property;
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card variant="borderless" style={panel} styles={panelBody}>
          <SectionTitle><WalletOutlined /> Requested Terms</SectionTitle>
          <InfoGrid cols={2}>
            <InfoItem label="Loan Amount" value={<span className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>{inr(app.loan.amount)}</span>} />
            <InfoItem label="Tenure" value={`${app.loan.tenureMonths} months`} />
            <InfoItem label="Rate of Interest" value={`${app.loan.interestRate}% p.a. (reducing)`} />
            <InfoItem label="EMI" value={<span className="tnum">{inr(app.loan.emi)}</span>} />
            <InfoItem label="Purpose" value={app.loan.purpose} />
            <InfoItem label="Scheme" value={app.loan.scheme} />
          </InfoGrid>
        </Card>
        {app.creditDecision?.decision === 'APPROVED' && (
          <Card variant="borderless" style={{ ...panel, marginTop: 16, background: '#f7fdf9', borderColor: '#d3f2e1' }} styles={panelBody}>
            <SectionTitle><CheckCircleFilled style={{ color: '#16a34a' }} /> Sanctioned Terms</SectionTitle>
            <InfoGrid cols={2}>
              <InfoItem label="Sanctioned Amount" value={<span className="tnum" style={{ fontWeight: 700, fontSize: 15, color: '#047857' }}>{inr(app.creditDecision.approvedAmount ?? app.loan.amount)}</span>} />
              <InfoItem label="Tenure" value={`${app.creditDecision.approvedTenure} months`} />
              <InfoItem label="Rate" value={`${app.creditDecision.approvedRate}% p.a.`} />
              <InfoItem label="Risk Grade" value={<RiskGradeTag grade={app.creditDecision.riskGrade} />} />
            </InfoGrid>
          </Card>
        )}
      </Col>
      <Col xs={24} lg={12}>
        {gold && (
          <Card variant="borderless" style={panel} styles={panelBody}>
            <SectionTitle><GoldOutlined /> Gold Collateral</SectionTitle>
            <InfoGrid cols={2}>
              <InfoItem label="Net Weight" value={`${gold.netWeightGrams} g`} />
              <InfoItem label="Gross Weight" value={`${gold.grossWeightGrams} g`} />
              <InfoItem label="Purity" value={`${gold.purityKarat}K`} />
              <InfoItem label="Rate / gram" value={inr(gold.ratePerGram)} />
              <InfoItem label="Valuation" value={<span className="tnum" style={{ fontWeight: 700 }}>{inr(gold.valuation)}</span>} />
              <InfoItem label="LTV" value={<span style={{ fontWeight: 700, color: gold.ltv <= 75 ? '#16a34a' : '#dc2626' }}>{gold.ltv}%</span>} />
              <InfoItem label="Valued By" value={gold.valuedBy} span={2} />
            </InfoGrid>
            <div style={{ marginTop: 14 }}>
              {gold.items.map((it) => (
                <div key={it.description} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#fffbeb', border: '1px solid #fde9c8', marginBottom: 6, fontSize: 12.5 }}>
                  <span style={{ color: '#475569' }}>{it.description}</span>
                  <span className="tnum" style={{ fontWeight: 600, color: '#b45309' }}>{it.weightGrams} g</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {property && (
          <Card variant="borderless" style={panel} styles={panelBody}>
            <SectionTitle><HomeOutlined /> Property Details</SectionTitle>
            <InfoGrid cols={2}>
              <InfoItem label="Type" value={property.type} />
              <InfoItem label="Market Value" value={<span className="tnum" style={{ fontWeight: 700 }}>{inr(property.marketValue)}</span>} />
              <InfoItem label="LTV" value={<span style={{ fontWeight: 700, color: property.ltv <= 80 ? '#16a34a' : '#dc2626' }}>{property.ltv}%</span>} />
              <InfoItem label="Stage" value={property.constructionStage} />
              {property.builder && <InfoItem label="Builder / Project" value={property.builder} />}
              <InfoItem label="Property Address" value={property.address} span={2} />
            </InfoGrid>
          </Card>
        )}
        {!gold && !property && (
          <Card variant="borderless" style={panel} styles={panelBody}>
            <SectionTitle><FileProtectOutlined /> Collateral</SectionTitle>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Unsecured product — no collateral attached. Hypothecation of financed asset applies." />
          </Card>
        )}
      </Col>
    </Row>
  );
};

// ════ TIMELINE ════
const FLOW_STAGES = [
  { key: 'SUBMITTED', label: 'Application Submitted' },
  { key: 'CREDIT', label: 'Credit Review' },
  { key: 'FINANCE_VERIFIED', label: 'Finance Review' },
  { key: 'EMANDATE', label: 'E-Mandate' },
  { key: 'DISBURSED', label: 'Disbursement' },
];

export const TimelineTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const events = [...app.timeline].sort((a, b) => dayjs(a.at).valueOf() - dayjs(b.at).valueOf());
  const reachedKeys = new Set(events.map((e) => (e.stage.startsWith('CREDIT') ? 'CREDIT' : e.stage)));
  const terminal = ['CREDIT_REJECTED', 'CREDIT_RETURNED'].includes(app.status);

  const items = [
    ...events.map((e) => ({
      key: e.id,
      color: e.stage === 'DISBURSED' ? 'green' : e.title.includes('Rejected') ? 'red' : e.title.includes('Returned') ? 'purple' : 'blue',
      children: (
        <div style={{ paddingBottom: 6 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>{e.title}</span>
            <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{fmtDateTime(e.at)}</span>
          </div>
          {e.description && <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{e.description}</div>}
          {e.remarks && <div style={{ fontSize: 12, color: '#475569', background: '#f8fafd', border: '1px solid #eef1f7', borderRadius: 8, padding: '6px 10px', marginTop: 6, maxWidth: 560 }}>“{e.remarks}”</div>}
          <div style={{ fontSize: 11.5, color: '#8a97ad', marginTop: 5 }}>
            <UserOutlined style={{ marginRight: 5 }} />{e.actor} · {e.role}
          </div>
        </div>
      ),
    })),
    ...(!terminal
      ? FLOW_STAGES.filter((s) => !reachedKeys.has(s.key) && !(s.key === 'FINANCE_VERIFIED' && reachedKeys.has('DISBURSED')))
          .map((s) => ({
            key: s.key,
            color: 'gray',
            children: (
              <div style={{ paddingBottom: 6 }}>
                <span style={{ fontWeight: 500, fontSize: 13, color: '#b6c2d6' }}>{s.label}</span>
                <span style={{ fontSize: 11.5, color: '#cbd5e1', marginLeft: 10 }}>pending</span>
              </div>
            ),
          }))
      : []),
  ];

  return (
    <Card variant="borderless" style={panel} styles={{ body: { padding: '26px 28px 10px' } }}>
      <Timeline className="app-timeline" items={items} />
    </Card>
  );
};

// ════ AUDIT ════
export const AuditTab: React.FC<{ app: LoanApplication }> = ({ app }) => {
  const auditLogs = useAppStore((s) => s.auditLogs);
  const rows = useMemo(() => auditLogs.filter((l) => l.entity === app.appNumber), [auditLogs, app.appNumber]);
  const cols: TableProps<AuditLog>['columns'] = [
    { title: 'Date & Time', dataIndex: 'at', width: 185, render: (v: string) => <span style={{ fontSize: 12.5, color: '#475569' }}>{fmtDateTime(v)}</span> },
    { title: 'User', dataIndex: 'user', render: (v: string, r) => <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{v}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{r.role}</div></div> },
    { title: 'Module', dataIndex: 'module', width: 110 },
    { title: 'Action', dataIndex: 'action', render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    {
      title: 'Change', key: 'change', width: 240,
      render: (_, r) => r.oldValue || r.newValue ? (
        <span style={{ fontSize: 12 }}>
          {r.oldValue && <Tag style={{ borderRadius: 6, background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>{r.oldValue}</Tag>}
          {r.oldValue && r.newValue && <span style={{ color: '#94a3b8' }}>→ </span>}
          {r.newValue && <Tag style={{ borderRadius: 6, background: '#ecfdf5', color: '#047857', borderColor: '#bbf7d0' }}>{r.newValue}</Tag>}
        </span>
      ) : <span style={{ color: '#cbd5e1' }}>—</span>,
    },
    { title: 'IP Address', dataIndex: 'ip', width: 120, render: (v: string) => <span className="tnum" style={{ fontSize: 12, color: '#64748b' }}>{v}</span> },
  ];
  return (
    <Card variant="borderless" style={panel} styles={{ body: { padding: '8px 10px' } }}>
      <Table<AuditLog> dataSource={rows} columns={cols} rowKey="id" size="small" pagination={false} />
    </Card>
  );
};

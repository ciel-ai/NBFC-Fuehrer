import React from 'react';
import { Button, Empty, Table, Tag } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { InfoGrid, InfoItem } from '../../components/InfoGrid';
import { RiskGradeTag, StatusTag } from '../../components/StatusTag';
import { fmtDate, fmtDateTime, inr } from '../../utils/format';
import { deriveDeviations } from '../../utils/deviations';
import { tvrStatus, cpvStatus } from '../../utils/verification';
import type { AppDocument, Deviation, LoanApplication } from '../../types';

// ─── Document shell ───────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Deviation['severity'], string> = { L1: 'gold', L2: 'red' };
const DEV_STATUS_COLOR: Record<Deviation['status'], string> = {
  OPEN: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'default',
};

/** One numbered CAM module. */
const CamModule: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({
  n,
  title,
  children,
}) => (
  <section className="cam-module" style={{ marginBottom: 20, breakInside: 'avoid' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '2px solid var(--ink-200)',
        paddingBottom: 6,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          minWidth: 24,
          borderRadius: 6,
          background: 'var(--accent, #156FE8)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-900)' }}>{title}</span>
    </div>
    {children}
  </section>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="u-sm u-ink-400" style={{ fontStyle: 'italic' }}>
    {children}
  </div>
);

const maskAccount = (acc: string): string =>
  acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc;

// ─── The CAM document ─────────────────────────────────────────────────────────

const CamDocument: React.FC<{ app: LoanApplication }> = ({ app }) => {
  // Print / Save-as-PDF via the browser. A body class scopes the print
  // stylesheet (index.css @media print) to the CAM subtree only. Backend
  // cam/generate produces the audit-versioned PDF later (S4 Appendix A).
  const handlePrint = (): void => {
    document.body.classList.add('cam-print');
    const cleanup = (): void => {
      document.body.classList.remove('cam-print');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  const c = app.customer;
  const gold = app.collateral?.gold;
  const property = app.collateral?.property;
  const bank = app.finance?.bank;
  // Read-only view: derive the current deviation posture even if the credit
  // drawer was never opened (no store write here).
  const deviations = app.deviations ?? deriveDeviations(app);
  const cd = app.creditDecision;
  const tvr = tvrStatus(app);
  const cpv = cpvStatus(app);
  const latestTvr = app.tvr?.[0];
  const latestCpv = app.cpv?.[0];

  const vStatusColor = (s: string): string =>
    s === 'POSITIVE'
      ? 'success'
      : s === 'NEGATIVE'
        ? 'error'
        : s === 'WAIVED'
          ? 'purple'
          : s === 'PENDING'
            ? 'default'
            : 'gold';

  // Credit / approval events for the approval chain (module 11).
  const approvalEvents = app.timeline.filter((e) =>
    /CREDIT|DEVIATION|APPROV|FINANCE|DISBURS/i.test(e.stage),
  );

  const docCols: TableProps<AppDocument>['columns'] = [
    { title: 'Document', dataIndex: 'name', render: (v: string) => <span className="u-medium">{v}</span> },
    { title: 'Category', dataIndex: 'category', width: 110 },
    { title: 'File', dataIndex: 'fileName', render: (v: string) => <span className="u-sm u-ink-400">{v}</span> },
    { title: 'Uploaded', dataIndex: 'uploadedAt', width: 120, render: (v: string) => fmtDate(v) },
    { title: 'Status', dataIndex: 'status', width: 110, render: (s: AppDocument['status']) => <StatusTag status={s} /> },
  ];

  const devCols: TableProps<Deviation>['columns'] = [
    { title: 'Code', dataIndex: 'code', render: (v: string) => <span className="u-semibold u-sm">{v}</span> },
    { title: 'Sev', dataIndex: 'severity', width: 56, render: (s: Deviation['severity']) => <Tag color={SEVERITY_COLOR[s]}>{s}</Tag> },
    { title: 'Category', dataIndex: 'category', width: 96 },
    { title: 'Description', dataIndex: 'description', render: (v: string) => <span className="u-sm">{v}</span> },
    { title: 'Status', dataIndex: 'status', width: 96, render: (s: Deviation['status']) => <Tag color={DEV_STATUS_COLOR[s]}>{s}</Tag> },
    {
      title: 'Decision',
      key: 'decision',
      render: (_, d) =>
        d.status === 'OPEN' ? (
          <span className="u-ink-300">—</span>
        ) : (
          <span className="u-sm u-ink-500">
            {d.decidedBy}
            {d.mitigant ? ` · ${d.mitigant}` : ''}
            {d.decidedRemarks ? ` · ${d.decidedRemarks}` : ''}
          </span>
        ),
    },
  ];

  return (
    <div className="cam-document" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Toolbar — hidden in the printout */}
      <div className="cam-toolbar no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>
          Print / Save as PDF
        </Button>
      </div>

      {/* Document header */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-900)', letterSpacing: 0.5 }}>
          CREDIT APPRAISAL MEMORANDUM
        </div>
        <div className="u-sm u-ink-400">Internal — Fuehrer Capital · Lending Operations</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
            marginTop: 8,
            fontSize: 12.5,
            color: 'var(--ink-500)',
            flexWrap: 'wrap',
          }}
        >
          <span className="u-semibold u-accent">{app.appNumber}</span>
          <span>{app.loanType} Loan</span>
          <span>{c.name}</span>
          <span>Generated {fmtDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* 1. Customer Information */}
      <CamModule n={1} title="Customer Information">
        <InfoGrid cols={3}>
          <InfoItem label="Full Name" value={c.name} />
          <InfoItem label="Date of Birth" value={`${fmtDate(c.dob)} (${c.age} yrs)`} />
          <InfoItem label="Gender" value={c.gender} />
          <InfoItem label="Marital Status" value={c.maritalStatus} />
          <InfoItem label="Father / Spouse" value={c.fatherOrSpouseName} />
          <InfoItem label="Dependents" value={c.dependents} />
          <InfoItem label="Mobile" value={`+91 ${c.mobile}`} numeric />
          <InfoItem label="Alternate Mobile" value={c.altMobile ? `+91 ${c.altMobile}` : '—'} numeric />
          <InfoItem label="Email" value={c.email} />
          <InfoItem label="PAN" value={app.kyc.panNumber} numeric />
          <InfoItem label="Aadhaar" value={app.kyc.aadhaarMasked} numeric />
          <InfoItem label="CKYC" value={app.kyc.ckycNumber ?? 'Pending'} numeric />
        </InfoGrid>
      </CamModule>

      {/* 2. Address */}
      <CamModule n={2} title="Address">
        <InfoGrid cols={1}>
          <InfoItem
            label={`Current Address${c.currentAddress.residenceType ? ` · ${c.currentAddress.residenceType}` : ''}${c.currentAddress.yearsAtAddress != null ? ` · ${c.currentAddress.yearsAtAddress} yrs` : ''}`}
            value={`${c.currentAddress.line1}${c.currentAddress.line2 ? ', ' + c.currentAddress.line2 : ''}, ${c.currentAddress.city}, ${c.currentAddress.state} — ${c.currentAddress.pincode}`}
          />
          <InfoItem
            label="Permanent Address"
            value={`${c.permanentAddress.line1}${c.permanentAddress.line2 ? ', ' + c.permanentAddress.line2 : ''}, ${c.permanentAddress.city}, ${c.permanentAddress.state} — ${c.permanentAddress.pincode}`}
          />
        </InfoGrid>
      </CamModule>

      {/* 3. Co-Applicant & Nominee */}
      <CamModule n={3} title="Co-Applicant & Nominee">
        <Note>
          No co-applicant or nominee is recorded against this application. (Co-applicant capture
          applies to housing and joint applications; nominee is captured at disbursal.)
        </Note>
      </CamModule>

      {/* 4. Employment & Income */}
      <CamModule n={4} title="Employment & Income">
        <InfoGrid cols={3}>
          <InfoItem label="Employment Type" value={c.employment.type} />
          <InfoItem label="Employer / Business" value={c.employment.employer} />
          <InfoItem label="Designation" value={c.employment.designation} />
          <InfoItem label="Experience" value={`${c.employment.yearsInJob} years`} />
          <InfoItem label="Monthly Income" value={inr(c.income.monthlyIncome)} numeric />
          <InfoItem label="Other Income" value={inr(c.income.otherIncome)} numeric />
          <InfoItem label="Existing Obligations" value={`${inr(c.income.existingObligations)}/mo`} numeric />
          <InfoItem label="Proposed EMI" value={`${inr(app.loan.emi)}/mo`} numeric />
          <InfoItem
            label="FOIR"
            value={
              <span style={{ fontWeight: 700, color: c.income.foir <= 55 ? 'var(--status-success-fg)' : 'var(--status-danger-fg)' }}>
                {c.income.foir}% {c.income.foir <= 55 ? '(within policy)' : '(above 55% ceiling)'}
              </span>
            }
          />
        </InfoGrid>
      </CamModule>

      {/* 5. Banking */}
      <CamModule n={5} title="Banking">
        {bank ? (
          <InfoGrid cols={3}>
            <InfoItem label="Account Holder" value={bank.accountName} />
            <InfoItem label="Account Number" value={maskAccount(bank.accountNumber)} numeric />
            <InfoItem label="IFSC" value={bank.ifsc} numeric />
            <InfoItem label="Bank" value={bank.bankName} />
            <InfoItem label="Branch" value={bank.branch} />
            <InfoItem label="Penny-drop" value={<StatusTag status={bank.pennyDropStatus === 'SUCCESS' ? 'VERIFIED' : bank.pennyDropStatus === 'PENDING' ? 'PENDING' : 'REJECTED'} />} />
          </InfoGrid>
        ) : (
          <Note>Disbursal bank account is captured and penny-drop verified at the finance stage.</Note>
        )}
      </CamModule>

      {/* 6. Collateral */}
      <CamModule n={6} title="Collateral">
        {gold ? (
          <>
            <InfoGrid cols={3}>
              <InfoItem label="Net Weight" value={`${gold.netWeightGrams} g`} numeric />
              <InfoItem label="Gross Weight" value={`${gold.grossWeightGrams} g`} numeric />
              <InfoItem label="Purity" value={`${gold.purityKarat}K`} />
              {gold.stoneWeightGrams !== undefined && <InfoItem label="Stone Weight" value={`${gold.stoneWeightGrams} g`} numeric />}
              {gold.impurityPct !== undefined && <InfoItem label="Impurity" value={`${gold.impurityPct}%`} numeric />}
              <InfoItem label="Items" value={gold.items.length} numeric />
            </InfoGrid>
            <div style={{ marginTop: 10 }}>
              {gold.items.map((it) => (
                <div
                  key={it.description}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderRadius: 6, background: 'var(--ink-50)', marginBottom: 4, fontSize: 12.5 }}
                >
                  <span className="u-ink-600">{it.description}</span>
                  <span className="tnum u-semibold">{it.weightGrams} g</span>
                </div>
              ))}
            </div>
          </>
        ) : property ? (
          <InfoGrid cols={2}>
            <InfoItem label="Property Type" value={property.type} />
            <InfoItem label="Market Value" value={inr(property.marketValue)} numeric />
            <InfoItem label="Construction Stage" value={property.constructionStage ?? '—'} />
            {property.builder && <InfoItem label="Builder / Project" value={property.builder} />}
            <InfoItem label="Address" value={property.address} span={2} />
          </InfoGrid>
        ) : (
          <Note>Unsecured product — no collateral. Hypothecation of the financed asset applies.</Note>
        )}
      </CamModule>

      {/* 7. Valuation */}
      <CamModule n={7} title="Valuation">
        {gold ? (
          <InfoGrid cols={3}>
            <InfoItem label="Rate / gram" value={inr(gold.ratePerGram)} numeric />
            <InfoItem label="Assessed Valuation" value={inr(gold.valuation)} numeric />
            <InfoItem
              label="LTV"
              value={<span style={{ fontWeight: 700, color: gold.ltv <= 75 ? 'var(--status-success-fg)' : 'var(--status-danger-fg)' }}>{gold.ltv}%</span>}
            />
            <InfoItem label="Valued By" value={gold.valuedBy} />
            <InfoItem label="Appraised At" value={gold.appraisedAt ? fmtDateTime(gold.appraisedAt) : 'Pending'} />
          </InfoGrid>
        ) : property ? (
          <InfoGrid cols={3}>
            <InfoItem label="Market Value" value={inr(property.marketValue)} numeric />
            <InfoItem
              label="LTV"
              value={<span style={{ fontWeight: 700, color: property.ltv <= 80 ? 'var(--status-success-fg)' : 'var(--status-danger-fg)' }}>{property.ltv}%</span>}
            />
            <InfoItem label="Valued By" value={property.valuedBy ?? '—'} />
            <InfoItem label="Appraised At" value={property.appraisedAt ? fmtDateTime(property.appraisedAt) : 'Pending'} />
          </InfoGrid>
        ) : (
          <Note>No collateral valuation — unsecured product.</Note>
        )}
      </CamModule>

      {/* 8. Loan Details */}
      <CamModule n={8} title="Loan Details">
        <InfoGrid cols={3}>
          <InfoItem label="Requested Amount" value={inr(app.loan.amount)} numeric />
          <InfoItem label="Tenure" value={`${app.loan.tenureMonths} months`} />
          <InfoItem label="Interest Rate" value={`${app.loan.interestRate}% p.a.`} />
          <InfoItem label="Indicative EMI" value={inr(app.loan.emi)} numeric />
          <InfoItem label="Purpose" value={app.loan.purpose} />
          <InfoItem label="Scheme" value={app.loan.scheme} />
        </InfoGrid>
        {cd?.decision === 'APPROVED' && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--ink-50)', border: '1px solid var(--status-success-tint)' }}>
            <InfoGrid cols={3}>
              <InfoItem label="Sanctioned Amount" value={<span className="u-success u-semibold">{inr(cd.approvedAmount ?? app.loan.amount)}</span>} numeric />
              <InfoItem label="Sanctioned Tenure" value={`${cd.approvedTenure} months`} />
              <InfoItem label="Sanctioned Rate" value={`${cd.approvedRate}% p.a.`} />
            </InfoGrid>
          </div>
        )}
      </CamModule>

      {/* 9. Bureau & Documents */}
      <CamModule n={9} title="Bureau & Documents">
        <InfoGrid cols={4}>
          <InfoItem
            label="Bureau Score"
            value={<span style={{ fontWeight: 700, color: app.bureau.score >= 700 ? 'var(--status-success-fg)' : app.bureau.score >= 650 ? 'var(--status-warning-fg)' : 'var(--status-danger-fg)' }}>{app.bureau.score}</span>}
            numeric
          />
          <InfoItem label="Total Accounts" value={app.bureau.totalAccounts} numeric />
          <InfoItem label="Overdue Accounts" value={app.bureau.overdueAccounts} numeric />
          <InfoItem label="Enquiries (6m)" value={app.bureau.enquiries6m} numeric />
        </InfoGrid>
        <div style={{ marginTop: 12 }}>
          <Table<AppDocument>
            dataSource={app.documents}
            columns={docCols}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </div>
      </CamModule>

      {/* 10. Verification & Deviations */}
      <CamModule n={10} title="Verification & Deviations">
        {deviations.length === 0 ? (
          <Note>No policy deviations — the application is within policy on all auto-checked parameters.</Note>
        ) : (
          <Table<Deviation>
            dataSource={deviations}
            columns={devCols}
            rowKey="id"
            size="small"
            pagination={false}
          />
        )}
        <div style={{ marginTop: 10 }}>
          <InfoGrid cols={2}>
            <InfoItem
              label="Tele-Verification (TVR)"
              value={
                <span>
                  <Tag color={vStatusColor(tvr)}>{tvr}</Tag>
                  {latestTvr && <span className="u-xs u-ink-400">attempt {latestTvr.attemptNo} · {latestTvr.status}</span>}
                  {app.tvrWaiver && <span className="u-xs u-ink-400">waived · {app.tvrWaiver.remarks}</span>}
                </span>
              }
            />
            <InfoItem
              label="Contact-Point Verification (CPV)"
              value={
                <span>
                  <Tag color={vStatusColor(cpv)}>{cpv}</Tag>
                  {latestCpv && <span className="u-xs u-ink-400">{latestCpv.type} · {latestCpv.addressVerified ? 'address verified' : 'address not verified'}</span>}
                  {app.cpvWaiver && <span className="u-xs u-ink-400">waived · {app.cpvWaiver.remarks}</span>}
                </span>
              }
            />
          </InfoGrid>
        </div>
      </CamModule>

      {/* 11. Credit Decision & Approval Chain */}
      <CamModule n={11} title="Credit Decision & Approval Chain">
        {cd ? (
          <InfoGrid cols={3}>
            <InfoItem label="Decision" value={<StatusTag status={cd.decision} size="md" />} />
            <InfoItem label="Risk Grade" value={<RiskGradeTag grade={cd.riskGrade} />} />
            <InfoItem label="Decided By" value={`${cd.decidedBy} · ${fmtDateTime(cd.decidedAt)}`} />
            {cd.reason && <InfoItem label="Reason" value={cd.reason} />}
            {cd.approvedDeviationIds && cd.approvedDeviationIds.length > 0 && (
              <InfoItem label="Approved Deviations" value={cd.approvedDeviationIds.length} numeric />
            )}
            <InfoItem label="Remarks" value={cd.remarks} span={3} />
          </InfoGrid>
        ) : (
          <Note>Credit decision pending — the application has not yet been underwritten.</Note>
        )}

        {approvalEvents.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="t-label" style={{ marginBottom: 6 }}>Approval Chain</div>
            {approvalEvents.map((e) => (
              <div key={e.id} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--ink-100)', fontSize: 12.5 }}>
                <span className="u-ink-400" style={{ width: 130, minWidth: 130 }}>{fmtDateTime(e.at)}</span>
                <span className="u-semibold" style={{ minWidth: 0 }}>{e.title}</span>
                <span className="u-ink-400" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{e.actor} · {e.role}</span>
              </div>
            ))}
          </div>
        )}
      </CamModule>

      {app.documents.length === 0 && deviations.length === 0 && !cd && (
        <Empty description="This application has limited data captured so far." />
      )}
    </div>
  );
};

export default CamDocument;

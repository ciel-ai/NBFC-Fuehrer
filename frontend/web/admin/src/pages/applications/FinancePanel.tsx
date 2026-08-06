import React, { useState } from 'react';
import { App, Button, Card, Checkbox, Divider, Modal, Result, Select, Steps } from 'antd';
import {
  BankOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { financeApi } from '../../api/finance.api';
import { USE_MOCK } from '../../config';
import { InfoGrid, InfoItem, SectionTitle } from '../../components/InfoGrid';
import { VendorRail } from '../../components/VendorStatus';
import { fmtDateTime, inr, maskAccount } from '../../utils/format';
import type { LoanApplication } from '../../types';

/**
 * Finance processing workspace shown on the application page for
 * CREDIT_APPROVED → FINANCE_PENDING → EMANDATE_PENDING → DISBURSED.
 */
const FinancePanel: React.FC<{ app: LoanApplication; readonly?: boolean }> = ({
  app,
  readonly,
}) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const financeVerify = useAppStore((s) => s.financeVerify);
  const setupEmandate = useAppStore((s) => s.setupEmandate);
  const refreshEmandate = useAppStore((s) => s.refreshEmandate);
  const disburse = useAppStore((s) => s.disburse);

  const [mandateModal, setMandateModal] = useState(false);
  const [mandateMode, setMandateMode] = useState<'Net Banking' | 'Debit Card' | 'Aadhaar'>(
    'Net Banking',
  );
  const [disburseModal, setDisburseModal] = useState(false);
  const [disburseMode, setDisburseMode] = useState<'NEFT' | 'RTGS' | 'IMPS'>('NEFT');
  const [makerChecker, setMakerChecker] = useState(false);
  const [doneLoan, setDoneLoan] = useState<string | null>(null);

  const actor = { name: user.name, role: user.role };
  const approved = app.creditDecision?.approvedAmount ?? app.loan.amount;
  const fees = app.finance?.fees;
  const totalFees = fees
    ? fees.processingFee + fees.gst + fees.insurance + fees.stampDuty + fees.documentation
    : 0;
  const emandate = app.finance?.emandate;

  const step =
    app.status === 'CREDIT_APPROVED'
      ? 0
      : app.status === 'FINANCE_PENDING'
        ? 1
        : app.status === 'EMANDATE_PENDING'
          ? 2
          : 3;

  if (
    ![
      'CREDIT_APPROVED',
      'FINANCE_PENDING',
      'EMANDATE_PENDING',
      'DISBURSED',
      'ACTIVE',
      'CLOSED',
    ].includes(app.status)
  )
    return null;

  return (
    <Card
      style={{
        border: '1px solid var(--ink-150)',
        background: 'linear-gradient(180deg, var(--ink-50) 0%, var(--ink-0) 100%)',
        marginBottom: 16,
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <SectionTitle>
          <BankOutlined /> Finance Processing
        </SectionTitle>
        <Steps
          size="small"
          current={step}
          style={{ maxWidth: 640 }}
          items={[
            { title: 'Verify', icon: <SafetyOutlined /> },
            { title: 'E-Mandate', icon: <ThunderboltOutlined /> },
            { title: 'Disburse', icon: <SendOutlined /> },
            { title: 'Done', icon: <CheckCircleOutlined /> },
          ]}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
        }}
      >
        {/* Loan summary */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--ink-100)',
            background: 'var(--ink-0)',
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'var(--ink-400)',
              marginBottom: 12,
            }}
          >
            Loan Summary
          </div>
          <InfoGrid cols={2}>
            <InfoItem
              label="Approved Amount"
              value={<span className="tnum u-semibold u-success">{inr(approved)}</span>}
            />
            <InfoItem label="EMI" value={<span className="tnum">{inr(app.loan.emi)}</span>} />
            <InfoItem
              label="Tenure"
              value={`${app.creditDecision?.approvedTenure ?? app.loan.tenureMonths} months`}
            />
            <InfoItem
              label="Rate"
              value={`${app.creditDecision?.approvedRate ?? app.loan.interestRate}%`}
            />
          </InfoGrid>
        </div>

        {/* Fees */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--ink-100)',
            background: 'var(--ink-0)',
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'var(--ink-400)',
              marginBottom: 12,
            }}
          >
            Deductions &amp; Net Payout
          </div>
          {fees ? (
            <div className="u-sm">
              {[
                ['Processing Fee', fees.processingFee],
                ['GST (18%)', fees.gst],
                ['Credit Insurance', fees.insurance],
                ['Stamp Duty', fees.stampDuty],
                ['Documentation', fees.documentation],
              ].map(([l, v]) => (
                <div
                  key={l as string}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '3.5px 0',
                    color: 'var(--ink-600)',
                  }}
                >
                  <span>{l}</span>
                  <span className="tnum">{inr(v as number)}</span>
                </div>
              ))}
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 700,
                  color: 'var(--ink-900)',
                }}
              >
                <span>Net Disbursement</span>
                <span className="tnum u-success">{inr(app.finance!.netDisbursement)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-400)', marginTop: 4 }}>
                Total deductions {inr(totalFees)}
              </div>
            </div>
          ) : (
            <div className="u-sm u-ink-400">Fee structure is applied at verification.</div>
          )}
        </div>

        {/* Bank + mandate */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid var(--ink-100)',
            background: 'var(--ink-0)',
            padding: '16px 18px',
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: 'var(--ink-400)',
              marginBottom: 12,
            }}
          >
            Beneficiary &amp; E-Mandate
          </div>
          {app.finance ? (
            <>
              <InfoGrid cols={1}>
                <InfoItem
                  label={`${app.finance.bank.bankName} · ${app.finance.bank.ifsc}`}
                  value={
                    <span>
                      <span className="tnum">{maskAccount(app.finance.bank.accountNumber)}</span> ·{' '}
                      {app.finance.bank.accountName}
                    </span>
                  }
                />
              </InfoGrid>

              {/* Both third-party checks now render through the same component, so
                  the state drives the colour. The penny-drop previously hardcoded
                  the SUCCESS tint and interpolated the status into the label — a
                  FAILED bank-account verification displayed in green. */}
              <VendorRail
                checks={[
                  {
                    label: 'Penny-drop',
                    vendor: 'Bank',
                    state: app.finance.bank.pennyDropStatus,
                    detail:
                      app.finance.bank.pennyDropStatus === 'FAILED'
                        ? 'Beneficiary name could not be confirmed — do not disburse'
                        : 'Beneficiary account and name confirmed',
                  },
                  {
                    label: 'E-Mandate',
                    vendor: 'NPCI NACH',
                    state: emandate?.status ?? 'NOT_SETUP',
                    reference: emandate?.umrn ?? null,
                    at: emandate?.registeredAt ? fmtDateTime(emandate.registeredAt) : null,
                    detail: emandate?.maxAmount ? (
                      <>
                        Debit cap <span className="tnum">{inr(emandate.maxAmount)}</span> ·{' '}
                        {emandate.frequency} · via {emandate.mode}
                      </>
                    ) : null,
                  },
                ]}
              />
            </>
          ) : (
            <div className="u-sm u-ink-400">Bank details get verified in the first step.</div>
          )}
        </div>
      </div>

      {/* actions */}
      {!readonly && (
        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          {app.status === 'CREDIT_APPROVED' && (
            <Button
              type="primary"
              icon={<SafetyOutlined />}
              onClick={() => {
                financeVerify(app.id, actor);
                message.success('Verification complete — fees applied, bank account penny-drop OK');
              }}
            >
              Verify Amount &amp; Bank Account
            </Button>
          )}
          {app.status === 'FINANCE_PENDING' && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={() => setMandateModal(true)}
            >
              Setup E-Mandate
            </Button>
          )}
          {app.status === 'EMANDATE_PENDING' && emandate?.status === 'PENDING' && (
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refreshEmandate(app.id, actor);
                message.success('NPCI confirmed — mandate is ACTIVE');
              }}
            >
              Refresh NPCI Status
            </Button>
          )}
          {app.status === 'EMANDATE_PENDING' && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              disabled={emandate?.status !== 'ACTIVE'}
              onClick={() => setDisburseModal(true)}
            >
              Disburse Loan
            </Button>
          )}
          {app.status === 'EMANDATE_PENDING' && emandate?.status !== 'ACTIVE' && (
            <span style={{ fontSize: 12, color: 'var(--ink-400)', alignSelf: 'center' }}>
              Disbursal unlocks once the mandate is ACTIVE.
            </span>
          )}
        </div>
      )}

      {/* e-mandate modal */}
      <Modal
        title={
          <span>
            <ThunderboltOutlined style={{ color: 'var(--status-info-fg)', marginRight: 8 }} />
            Register NACH E-Mandate
          </span>
        }
        open={mandateModal}
        onCancel={() => setMandateModal(false)}
        okText="Send Registration Request"
        onOk={async () => {
          setupEmandate(app.id, mandateMode, actor);
          setMandateModal(false);
          message.success('Mandate registration initiated with NPCI');
        }}
      >
        <InfoGrid cols={2}>
          <InfoItem label="Debit Bank" value={app.finance?.bank.bankName} />
          <InfoItem
            label="Account"
            value={
              <span className="tnum">{maskAccount(app.finance?.bank.accountNumber ?? '')}</span>
            }
          />
          <InfoItem
            label="Max Debit"
            value={
              <span className="tnum">{inr(Math.ceil((app.loan.emi * 1.05) / 100) * 100)}</span>
            }
          />
          <InfoItem label="Frequency" value="Monthly · until loan closure" />
        </InfoGrid>
        <Divider style={{ margin: '14px 0' }} />
        <div style={{ marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-600)' }}>
          Customer Authentication Mode
        </div>
        <Select
          value={mandateMode}
          onChange={setMandateMode}
          style={{ width: '100%' }}
          options={[
            { value: 'Net Banking', label: 'Net Banking (instant)' },
            { value: 'Debit Card', label: 'Debit Card' },
            { value: 'Aadhaar', label: 'Aadhaar OTP (e-sign)' },
          ]}
        />
      </Modal>

      {/* disburse modal */}
      <Modal
        title={
          <span>
            <DollarOutlined style={{ color: 'var(--status-success-fg)', marginRight: 8 }} />
            Disburse Loan — {app.appNumber}
          </span>
        }
        open={disburseModal}
        onCancel={() => {
          setDisburseModal(false);
          setMakerChecker(false);
        }}
        okText={`Disburse ${inr(app.finance?.netDisbursement ?? 0)}`}
        okButtonProps={{ disabled: !makerChecker }}
        onOk={async () => {
          // In live mode a failed disbursement must abort. Booking a UTR and a
          // loan account in the browser would tell the officer money moved when
          // the bank never released it. Local-only recording is legitimate
          // solely under VITE_USE_MOCK.
          if (!USE_MOCK) {
            try {
              await financeApi.disburse(app.id, { mode: disburseMode });
            } catch {
              message.error(
                `Disbursement for ${app.appNumber} was not accepted — no money moved and nothing was recorded. Please retry.`,
              );
              return;
            }
          }
          const loanNo = disburse(app.id, disburseMode, actor);
          setDisburseModal(false);
          setMakerChecker(false);
          if (loanNo) setDoneLoan(loanNo);
        }}
      >
        <InfoGrid cols={2}>
          <InfoItem label="Beneficiary" value={app.finance?.bank.accountName} />
          <InfoItem
            label="Account"
            value={
              <span className="tnum">
                {maskAccount(app.finance?.bank.accountNumber ?? '')} · {app.finance?.bank.ifsc}
              </span>
            }
          />
          <InfoItem label="Gross Sanction" value={<span className="tnum">{inr(approved)}</span>} />
          <InfoItem
            label="Net Payout"
            value={
              <span className="tnum u-semibold u-success">
                {inr(app.finance?.netDisbursement ?? 0)}
              </span>
            }
          />
        </InfoGrid>
        <Divider style={{ margin: '14px 0' }} />
        <div style={{ marginBottom: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-600)' }}>
          Payment Mode
        </div>
        <Select
          value={disburseMode}
          onChange={setDisburseMode}
          style={{ width: '100%', marginBottom: 14 }}
          options={[
            { value: 'NEFT', label: 'NEFT — batch settlement' },
            { value: 'RTGS', label: 'RTGS — recommended above ₹2,00,000' },
            { value: 'IMPS', label: 'IMPS — instant, small ticket' },
          ]}
        />
        <Checkbox checked={makerChecker} onChange={(e) => setMakerChecker(e.target.checked)}>
          I confirm maker-checker approval has been obtained and the sanction conditions are met.
        </Checkbox>
      </Modal>

      {/* success */}
      <Modal open={!!doneLoan} footer={null} onCancel={() => setDoneLoan(null)} width={520}>
        <Result
          status="success"
          title="Loan Disbursed Successfully"
          subTitle={
            <span>
              UTR <strong className="tnum">{app.finance?.disbursement?.utr}</strong> · Loan account{' '}
              <strong>{doneLoan}</strong> created in LMS with EMI schedule generated.
            </span>
          }
          extra={[
            <Button key="loan" type="primary" onClick={() => navigate(`/lms/accounts/${doneLoan}`)}>
              View Loan Account
            </Button>,
            <Button key="close" onClick={() => setDoneLoan(null)}>
              Close
            </Button>,
          ]}
        />
      </Modal>
    </Card>
  );
};

export default FinancePanel;

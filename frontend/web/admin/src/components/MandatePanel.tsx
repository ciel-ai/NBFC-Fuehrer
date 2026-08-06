import React from 'react';
import { Alert, Card } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { InfoGrid, InfoItem, SectionTitle } from './InfoGrid';
import { StatusTag } from './StatusTag';
import { fmtDate, fmtDateTime, inr } from '../utils/format';
import type { LoanMandate } from '../types';

/* ============================================================================
 * Mandate health on a LIVE loan.
 *
 * The portal used to show mandate state only while an application sat in the
 * finance queue; the moment the loan disbursed the field vanished. That is
 * exactly backwards — before disbursal the mandate is a checklist item, but
 * after it, it is the mechanism every future EMI depends on. A dead mandate on
 * an active loan is silent revenue loss until someone notices the bounces.
 *
 * Three distinct states, never collapsed into one:
 *   mandate === undefined → we could not read it. Say so; do not imply "none".
 *   status  === NOT_SETUP → there genuinely is no mandate. This is actionable.
 *   otherwise             → show it, and shout if it is failing.
 * ==========================================================================*/

/** Every mandate state is in StatusTag's vocabulary — no local colour table. */
export const MandateStatusTag: React.FC<{ status: LoanMandate['status'] }> = ({ status }) => (
  <span title={`e-NACH mandate status: ${status.replace(/_/g, ' ').toLowerCase()}`}>
    <StatusTag status={status} />
  </span>
);

export const MandatePanel: React.FC<{
  mandate?: LoanMandate;
  /** A closed loan's cancelled mandate is expected, not a problem worth alarming about. */
  loanClosed?: boolean;
  style?: React.CSSProperties;
}> = ({ mandate, loanClosed, style }) => {
  const body = (children: React.ReactNode): React.ReactElement => (
    <Card style={style} styles={{ body: { padding: '20px 22px' } }}>
      <SectionTitle
        extra={mandate ? <MandateStatusTag status={mandate.status} /> : undefined}
      >
        <BankOutlined /> e-NACH Mandate
      </SectionTitle>
      {children}
    </Card>
  );

  if (!mandate) {
    return body(
      <Alert
        type="warning"
        showIcon
        message="Mandate status unavailable"
        description="The mandate service did not respond. This does not mean the loan has no mandate — do not treat it as one."
      />,
    );
  }

  if (mandate.status === 'NOT_SETUP') {
    return body(
      <Alert
        type="error"
        showIcon
        message="No auto-debit mandate on this live loan"
        description="Every EMI on this account has to be collected manually until a mandate is registered."
      />,
    );
  }

  const failing = mandate.status === 'FAILED' || mandate.consecutiveFailures > 0;

  return body(
    <>
      {failing && !loanClosed && (
        <Alert
          style={{ marginBottom: 14 }}
          type="error"
          showIcon
          message={
            mandate.consecutiveFailures > 0
              ? `${mandate.consecutiveFailures} consecutive presentation${mandate.consecutiveFailures > 1 ? 's have' : ' has'} failed`
              : 'This mandate is failing'
          }
          description={mandate.failureReason ?? 'Auto-debit is no longer reliable on this account.'}
        />
      )}
      <InfoGrid cols={2}>
        <InfoItem
          label="UMRN"
          numeric
          value={mandate.umrn ?? <span className="u-ink-400">Not yet issued</span>}
        />
        <InfoItem label="Bank" value={`${mandate.bankName} · ${mandate.accountMasked}`} />
        <InfoItem label="IFSC" numeric value={mandate.ifsc} />
        <InfoItem label="Debit Limit" numeric value={inr(mandate.maxAmount)} />
        <InfoItem
          label="Debit Day"
          value={mandate.debitDay ? `${mandate.debitDay} of every month` : undefined}
        />
        <InfoItem label="Registered" value={mandate.registeredOn && fmtDate(mandate.registeredOn)} />
        <InfoItem label="Valid Till" value={mandate.validTill && fmtDate(mandate.validTill)} />
        <InfoItem
          label="Last Presentation"
          value={
            mandate.lastDebitOn ? (
              <span>
                {fmtDateTime(mandate.lastDebitOn)}{' '}
                {mandate.lastDebitStatus && (
                  <StatusTag
                    status={mandate.lastDebitStatus === 'FAILED' ? 'BOUNCED' : mandate.lastDebitStatus}
                  />
                )}
              </span>
            ) : undefined
          }
        />
      </InfoGrid>
    </>,
  );
};

export default MandatePanel;

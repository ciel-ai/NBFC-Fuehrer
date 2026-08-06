import React from 'react';
import { StatusTag } from './StatusTag';
import './VendorStatus.css';

/* ============================================================================
 * Third-party integration status.
 *
 * Every external check in the pipeline — UIDAI e-KYC, NSDL PAN, the bureau pull,
 * the bank penny-drop, NPCI e-mandate registration, eSign — has the same shape:
 * a named vendor, a state, and usually a reference and a timestamp. They were
 * rendered five different ways across four screens: a bespoke KycCard here, a
 * boolean tick there, a raw <Tag> somewhere else.
 *
 * That inconsistency was not only cosmetic. The penny-drop tag in FinancePanel
 * hardcoded the SUCCESS tint and then interpolated whatever status it was given —
 * so a FAILED bank-account verification rendered in green. In a lending
 * back-office that is how money reaches the wrong account.
 *
 * One component. The state drives the colour, always.
 * ==========================================================================*/

/** The vocabulary every vendor integration reports in. */
export type VendorState =
  'SUCCESS' | 'VERIFIED' | 'ACTIVE' | 'COMPLETED' | 'PENDING' | 'NOT_SETUP' | 'FAILED' | 'REJECTED';

export interface VendorCheckProps {
  /** What was checked. "Aadhaar e-KYC", "Penny-drop". */
  label: string;
  /** Who performed it. "UIDAI", "NPCI", "NSDL". Shown as provenance. */
  vendor?: string;
  state: VendorState;
  /** UMRN, transaction id, masked identifier. Rendered tabular. */
  reference?: string | null;
  /** When it completed. */
  at?: string | null;
  /** Anything else worth one line — debit cap, frequency, failure reason. */
  detail?: React.ReactNode;
}

export const VendorCheck: React.FC<VendorCheckProps> = ({
  label,
  vendor,
  state,
  reference,
  at,
  detail,
}) => (
  <div className="vendor-check">
    <div className="vendor-check__head">
      <span className="vendor-check__label">
        {label}
        {vendor && <span className="vendor-check__vendor">{vendor}</span>}
      </span>
      {/* The tone comes from the state. It cannot be hardcoded at the call site. */}
      <StatusTag status={state} />
    </div>

    {(reference || at || detail) && (
      <div className="vendor-check__meta">
        {reference && <span className="tnum vendor-check__ref">{reference}</span>}
        {detail && <span>{detail}</span>}
        {at && <span className="vendor-check__at">{at}</span>}
      </div>
    )}
  </div>
);

/** A vertical rail of vendor checks — used on the finance and KYC panels. */
export const VendorRail: React.FC<{ checks: VendorCheckProps[] }> = ({ checks }) => (
  <div className="vendor-rail">
    {checks.map((c) => (
      <VendorCheck key={c.label} {...c} />
    ))}
  </div>
);

export default VendorCheck;

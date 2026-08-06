// src/utils/finance.ts
//
// Pure money math for the lending flow — extracted from store/appStore.ts so it
// can be unit-tested in isolation (G2 / Testing Audit finding #1). These functions
// are the single source of truth for fees and amortization; the store calls them.
//
// Convention reminder: amounts here are whole rupees (the admin store works in
// rupees; the paise→rupee division happens at the API ingest boundary).

import type { LoanType } from '../types';
import { calcEmi } from './format';

export interface LoanFees {
  processingFee: number;
  gst: number;
  insurance: number;
  stampDuty: number;
  documentation: number;
  /** approved amount minus every fee above */
  netDisbursement: number;
}

/**
 * Fee schedule per product, applied to the approved amount.
 *   Processing fee: HOUSING 1.0% · GOLD 0.5% · CDL 2.5%, rounded to the nearest ₹100.
 *   GST: 18% of the processing fee.
 *   Insurance: CDL 1.2% · HOUSING 0.4% · GOLD none.
 *   Stamp duty / documentation: flat, higher for HOUSING.
 * Mirrors the exact arithmetic that used to live inline in appStore.financeVerify.
 */
export function calcFees(loanType: LoanType, approvedAmount: number): LoanFees {
  const processingFee =
    Math.round((approvedAmount * (loanType === 'HOUSING' ? 0.01 : loanType === 'GOLD' ? 0.005 : 0.025)) / 100) * 100;
  const gst = Math.round(processingFee * 0.18);
  const insurance =
    loanType === 'CDL'
      ? Math.round(approvedAmount * 0.012)
      : loanType === 'HOUSING'
        ? Math.round(approvedAmount * 0.004)
        : 0;
  const stampDuty = loanType === 'HOUSING' ? 600 : 100;
  const documentation = loanType === 'HOUSING' ? 1500 : 250;
  const netDisbursement = approvedAmount - processingFee - gst - insurance - stampDuty - documentation;
  return { processingFee, gst, insurance, stampDuty, documentation, netDisbursement };
}

export interface AmortRow {
  seq: number;
  principal: number;
  interest: number;
  emi: number;
  balance: number;
}

/**
 * Reducing-balance amortization schedule (numeric only — dates and row status are
 * layered on by the caller). Interest each period is on the outstanding balance;
 * the final instalment absorbs any rounding so the balance closes to exactly 0.
 *
 * Invariants (see finance.test.ts): rows.length === months;
 * sum(principal) === principal; final balance === 0.
 * Mirrors the exact loop that used to live inline in appStore.disburse.
 */
export function buildAmortization(principal: number, annualRatePct: number, months: number): AmortRow[] {
  const emi = calcEmi(principal, annualRatePct, months);
  const r = annualRatePct / 12 / 100;
  let balance = principal;
  const rows: AmortRow[] = [];
  for (let s = 1; s <= months; s++) {
    const interest = Math.round(balance * r);
    const prin = s === months ? balance : Math.min(balance, emi - interest);
    balance = Math.max(0, balance - prin);
    rows.push({
      seq: s,
      principal: prin,
      interest,
      emi: s === months ? prin + interest : emi,
      balance,
    });
  }
  return rows;
}

// src/features/sales/api/cdlSubmitPayload.ts
//
// Wizard form state → the canonical CDL application request.
//
// The wizard collects far more than the application endpoint accepts (FDO
// code, selfie, bank-statement months, consent checkboxes, derived display
// fields) and the API validates with Joi stripUnknown, so anything sent under
// the wrong name is deleted in silence rather than rejected. Building the body
// explicitly here means the mapping is one readable list rather than an
// accident of which form keys happen to match.
//
// Fields the API deliberately does NOT accept, and why:
//   emiDisplay / processingFeeDisplay  derived on screen for the agent; the
//                                      backend computes both authoritatively
//                                      when it books the loan.
//   foirDisplay                        indicative only; the credit assessment
//                                      recomputes FOIR server-side.
//   fdoCode / branch / selfie / …      collected for the sales process, not
//                                      part of the loan application record.

import type { CdlApplicationInput } from '@/src/entities/consumerDurableLoan';
import { toCdlEmploymentType } from '@/src/entities/consumerDurableLoan';

export type CdlSalesSubmitBody = CdlApplicationInput & { customerId: string };

const num = (v: unknown): number => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => String(v ?? '').trim();

/**
 * @param values  the wizard's accumulated form state
 * @param customerId  users.id of the customer the agent selected. The API
 *   rejects the submission if this is missing or does not resolve to a real,
 *   active customer — a sales user cannot file against an invented person.
 */
export function toCdlSalesSubmitBody(
  values: Record<string, unknown>,
  customerId: string,
): CdlSalesSubmitBody {
  return {
    customerId,
    productName: str(values.productName),
    productValue: num(values.productValue),
    downPayment: num(values.downPayment),
    loanAmount: num(values.loanAmount),
    tenureMonths: num(values.tenureMonths),
    // The wizard's employment select is lowercase for display; the wire enum
    // is uppercase.
    employmentType: toCdlEmploymentType(str(values.employmentType)),
    monthlyIncome: num(values.monthlyIncome),
    // In the sales channel the store is the merchant the agent is standing in.
    storeName: str(values.merchantName) || str(values.retailShopName),
    storeCity: str(values.city),
    ...(values.interestRate !== undefined && values.interestRate !== ''
      ? { interestRate: num(values.interestRate) }
      : {}),
  };
}

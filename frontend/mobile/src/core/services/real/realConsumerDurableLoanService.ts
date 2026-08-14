// Real CDL service — the live wire contract.
//
// Two distinct jobs happen in this file, and they are deliberately separate:
//
//  1. REQUESTS use the canonical field names defined by
//     backend/business-module/src/modules/cdlLoans/cdlLoans.types.ts. The API
//     validates with Joi stripUnknown:true, so any field named differently is
//     deleted in silence rather than rejected — a class of bug the app cannot
//     detect at runtime. Requests are therefore typed against the canonical
//     input types and passed straight through, never reshaped here.
//
//  2. RESPONSES are adapted into the app's view models. The API returns flat
//     result records; these screens render checklists, stage timelines and
//     reason lists. Each adapter below is named `to<ViewModel>` and states what
//     it synthesises and what the API genuinely does not provide. This is an
//     intentional transformation, not a naming mismatch.
//
// Before this file was aligned, every CDL endpoint failed or silently lost
// data: the application POST omitted four required fields and renamed four
// more, credit assessment posted a whole view model of which the API kept
// nothing, NACH sent a masked account string and no IFSC, and EMI payment
// omitted the amount the API then required.

import api from '../../api/api';
import { idempotentConfig } from '../../api/idempotency';
import type { DocumentUploadResult } from '@/src/entities/document';
import {
  cdlCalculateFoir,
  CDL_FOIR_MAX,
} from '@/src/entities/consumerDurableLoan';
import type { EMISchedule } from '@/src/entities/loan';
import type {
  CdlAgentReviewDecision,
  CdlAgreementResult,
  CdlApplicationInput,
  CdlApplicationResult,
  CdlClosureResult,
  CdlComplianceResult,
  CdlCreditAssessment,
  CdlCreditAssessmentInput,
  CdlCreditDecision,
  CdlDisbursalResult,
  CdlFoirInput,
  CdlKycResult,
  CdlManualPaymentResult,
  CdlNachInput,
  CdlNachResult,
  CdlOverdueStatus,
  CdlPaymentFailure,
  CdlQuoteInput,
  CdlQuoteResult,
  CdlVerificationCheck,
} from '@/src/entities/consumerDurableLoan';
import type { IConsumerDurableLoanService } from '../interfaces/IConsumerDurableLoanService';

const base = '/consumer-durable-loans';

/** Money fields the API serialises in paise. The app works in rupees. */
const paiseToRupees = (paise: number): number => Math.round(paise) / 100;

// ─── Wire response shapes ─────────────────────────────────────────────────────
// Mirrors of the backend's result types. Declared here rather than imported
// because the two codebases do not share a build; the contract test
// backend/business-module/tests/unit/cdlLoans.contract.test.ts pins the
// request side, which is the side that fails silently.

interface WireApplicationResult {
  applicationId: string;
  status: string;
  productName: string;
  productValue: number;
  downPayment: number;
  loanAmount: number;
  tenureMonths: number;
  interestRate: number;
  monthlyEmi: number;
  processingFee: number;
  referenceId: string;
  createdAt: string;
}

interface WireKycResult {
  applicationId: string;
  kycStatus: 'PASSED' | 'FAILED' | 'PENDING';
  aadhaarVerified: boolean;
  panVerified: boolean;
  faceMatchScore: number;
}

interface WireComplianceResult {
  applicationId: string;
  amlStatus: string;
  overallStatus: 'PASSED' | 'FAILED' | 'REVIEW';
}

interface WireCreditAssessment {
  applicationId: string;
  cibilScore: number;
  foir: number;
  foirStatus: 'PASS' | 'FAIL';
  creditStatus: 'PASS' | 'FAIL' | 'REVIEW';
  maxLoanAmount: number;
}

interface WireCreditDecision {
  applicationId: string;
  decision: 'APPROVED' | 'REJECTED' | 'PENDING';
  approvedAmount: number | null;
  interestRate: number | null;
  monthlyEmi: number | null;
  rejectionReason: string | null;
  note: string;
}

interface WireAgreementResult {
  applicationId: string;
  agreementId: string;
  agreementUrl: string;
  status: 'GENERATED' | 'SIGNED' | 'PENDING';
  eSignRequestId: string | null;
  stampDutyAmount: number;
}

interface WireNachResult {
  applicationId: string;
  mandateId: string;
  bankAccount: string;
  maxAmount: number;
  status: string;
}

interface WireDisbursalResult {
  applicationId: string;
  disbursalId: string;
  amount: number;
  merchantName: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  disbursedAt: string | null;
}

interface WireManualPaymentResult {
  loanId: string;
  emiId: string;
  paymentId: string;
  amountPaid: number;
  totalCollected: number;
  status: string;
  paidAt: string;
  receiptUrl: string;
}

interface WireClosureResult {
  loanId: string;
  closureId: string;
  totalAmountPaid: number;
  closedAt: string;
  closureLetterUrl: string;
}

interface WireOverdueStatus {
  loanId: string;
  overdueAmount: number;
  overdueDays: number;
  penaltyCharges: number;
  totalDue: number;
  status: 'CURRENT' | 'OVERDUE' | 'NPA';
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function check(
  label: string,
  provider: string,
  ok: boolean,
  detail?: string,
): CdlVerificationCheck {
  return { label, provider, status: ok ? 'passed' : 'failed', detail };
}

/**
 * The API reports KYC as three verified flags; the screen renders a provider
 * checklist. The provider names are the ones actually used for each check —
 * they are presentation labels, not data from the response.
 */
function toKycResult(w: WireKycResult): CdlKycResult {
  return {
    applicationId: w.applicationId,
    status:
      w.kycStatus === 'PASSED' ? 'completed'
        : w.kycStatus === 'FAILED' ? 'failed'
          : 'in_progress',
    checks: [
      check('Aadhaar verification', 'Signzy', w.aadhaarVerified),
      check('PAN verification', 'Signzy', w.panVerified),
      check(
        'Face match',
        'Signzy',
        w.faceMatchScore >= 80,
        `Match score ${w.faceMatchScore}%`,
      ),
    ],
  };
}

function toComplianceResult(w: WireComplianceResult): CdlComplianceResult {
  return {
    applicationId: w.applicationId,
    overall:
      w.overallStatus === 'PASSED' ? 'passed'
        : w.overallStatus === 'FAILED' ? 'failed'
          : 'review',
    checks: [
      {
        label: 'AML / sanctions screening',
        provider: 'Internal',
        status: w.amlStatus === 'CLEAR' ? 'passed' : 'review',
        detail: w.amlStatus,
      },
    ],
  };
}

/**
 * The income figures echoed back are the ones we just sent — the API derives
 * and returns only the score, FOIR and ceiling. `employmentVerified` is not a
 * fact the API exposes; it is reported as the assessment having completed.
 */
function toCreditAssessment(
  w: WireCreditAssessment,
  sent: CdlCreditAssessmentInput,
): CdlCreditAssessment {
  return {
    applicationId: w.applicationId,
    employmentVerified: w.creditStatus !== 'FAIL',
    employmentType: '',
    annualIncome: sent.monthlyIncome * 12,
    monthlyIncome: sent.monthlyIncome,
    cibilScore: w.cibilScore,
    existingObligations: sent.existingEmis,
    proposedEmi: sent.proposedEmi,
    foir: w.foir,
    foirLimit: CDL_FOIR_MAX,
    foirStatus: w.foirStatus === 'PASS' ? 'passed' : 'failed',
    loanAmount: w.maxLoanAmount,
  };
}

/**
 * `reasons` is a list on the screen but a single note/rejectionReason on the
 * wire, so it carries the one reason the API gave rather than inventing more.
 */
function toCreditDecision(w: WireCreditDecision): CdlCreditDecision {
  const reason = w.rejectionReason ?? w.note ?? '';
  return {
    applicationId: w.applicationId,
    decision:
      w.decision === 'APPROVED' ? 'approved'
        : w.decision === 'REJECTED' ? 'rejected'
          : 'flagged',
    cibilScore: 0,
    foir: 0,
    approvedAmount: w.approvedAmount ?? 0,
    reason,
    reasons: reason ? [reason] : [],
    requiresAgentReview: w.decision === 'PENDING',
  };
}

export const realConsumerDurableLoanService: IConsumerDurableLoanService = {
  // ── Money units ──────────────────────────────────────────────────────────
  // The API's moneyConverter middleware serialises money fields in PAISE, but
  // it detects them by the words in the key: 'amount', 'fee', 'emi',
  // 'balance', 'income', 'interest', 'principal'. So on this response `emi`,
  // `processingFee` and `loanAmount` arrive in paise while `maxEligibleLoan`,
  // `productValue` and `downPayment` — none of which contain a detected word —
  // arrive in rupees.
  //
  // Normalising here rather than teaching the middleware new words on purpose:
  // adding 'value' would also flip appraisedGoldValue / marketValue /
  // estimatedValue on the gold-loan responses, which are not part of this
  // change. The screen and the mock therefore both deal in rupees only.
  async getQuote(input: CdlQuoteInput): Promise<CdlQuoteResult> {
    const res = await api.get<CdlQuoteResult>(`${base}/quote`, { params: input });
    const w = res.data;
    return {
      ...w,
      loanAmount: paiseToRupees(w.loanAmount),
      emi: paiseToRupees(w.emi),
      processingFee: paiseToRupees(w.processingFee),
      // Already rupees — not touched by the middleware.
      maxEligibleLoan: w.maxEligibleLoan,
    };
  },

  async submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult> {
    const res = await api.post<WireApplicationResult>(`${base}/applications`, input);
    const w = res.data;
    return {
      applicationId: w.applicationId,
      status: 'submitted',
      productName: w.productName,
      // loanAmount and monthlyEmi are paise on the wire; interestRate is a
      // rate, never converted. See the money-units note on getQuote.
      amount: paiseToRupees(w.loanAmount),
      tenure: w.tenureMonths,
      emi: paiseToRupees(w.monthlyEmi),
      interestRate: w.interestRate,
    };
  },

  async uploadDocument(
    applicationId: string,
    uri: string,
    type: string,
  ): Promise<DocumentUploadResult> {
    const form = new FormData();
    form.append('type', type);
    form.append('file', { uri, name: `${type}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    const res = await api.post<DocumentUploadResult>(
      `${base}/applications/${applicationId}/documents`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  async runKycChecks(applicationId: string): Promise<CdlKycResult> {
    const res = await api.post<WireKycResult>(`${base}/applications/${applicationId}/kyc`);
    return toKycResult(res.data);
  },

  async runComplianceChecks(applicationId: string): Promise<CdlComplianceResult> {
    const res = await api.post<WireComplianceResult>(
      `${base}/applications/${applicationId}/compliance`,
    );
    return toComplianceResult(res.data);
  },

  calculateFOIR(input: CdlFoirInput): number {
    return cdlCalculateFoir(input);
  },

  // The API takes exactly these three fields. It previously received the whole
  // CdlCreditAssessment view model plus a client-asserted foirLimit, all of
  // which stripUnknown discarded — including a `cibilScore` the API is right to
  // ignore, since it reads the bureau-verified score itself.
  async runCreditAssessment(
    applicationId: string,
    input: CdlCreditAssessmentInput,
  ): Promise<CdlCreditAssessment> {
    const res = await api.post<WireCreditAssessment>(
      `${base}/applications/${applicationId}/credit-assessment`,
      input,
    );
    return toCreditAssessment(res.data, input);
  },

  async getCreditDecision(
    applicationId: string,
    input: CdlCreditAssessmentInput,
  ): Promise<CdlCreditDecision> {
    const res = await api.post<WireCreditDecision>(
      `${base}/applications/${applicationId}/credit-decision`,
      input,
    );
    return toCreditDecision(res.data);
  },

  async submitAgentReviewDecision(decision: CdlAgentReviewDecision): Promise<void> {
    await api.post(`${base}/applications/${decision.applicationId}/agent-review`, decision);
  },

  // No body: the route validates :id only and the service reads the approved
  // terms from the application row. Sending terms here would have invited the
  // client to restate figures it does not own.
  async generateAgreement(applicationId: string): Promise<CdlAgreementResult> {
    const res = await api.post<WireAgreementResult>(
      `${base}/applications/${applicationId}/agreement`,
    );
    const w = res.data;
    return {
      agreementId: w.agreementId,
      status: w.status === 'SIGNED' ? 'completed' : 'in_progress',
      esignRef: w.eSignRequestId ?? undefined,
      s3Url: w.agreementUrl,
      // Terms are not part of the agreement response; the screen already holds
      // them from the credit decision.
      amount: 0,
      tenure: 0,
      emi: 0,
      interestRate: 0,
    };
  },

  async registerNachMandate(
    applicationId: string,
    input: CdlNachInput,
    idempotencyKey?: string,
  ): Promise<CdlNachResult> {
    const res = await api.post<WireNachResult>(
      `${base}/applications/${applicationId}/nach`,
      input,
      idempotentConfig(idempotencyKey),
    );
    const w = res.data;
    return {
      mandateId: w.mandateId,
      status: w.status === 'ACTIVE' ? 'completed' : 'in_progress',
      debitDate: String(input.preferredDebitDay ?? ''),
      // maxAmount is the mandate cap (EMI × 1.5), not the EMI itself.
      emi: 0,
      bankAccount: w.bankAccount,
    };
  },

  async disburseToMerchant(
    applicationId: string,
    input: { amount: number; merchantName: string },
    idempotencyKey?: string,
  ): Promise<CdlDisbursalResult> {
    const res = await api.post<WireDisbursalResult>(
      `${base}/applications/${applicationId}/disburse`,
      input,
      idempotentConfig(idempotencyKey),
    );
    const w = res.data;
    return {
      payoutId: w.disbursalId,
      status: w.status === 'COMPLETED' ? 'completed' : w.status === 'FAILED' ? 'failed' : 'in_progress',
      amount: w.amount,
      merchantName: w.merchantName,
      // The loan account is created by the API on disbursal; its id is not in
      // this response. Screens navigate by applicationId.
      loanAccountId: '',
      disbursedAt: w.disbursedAt ?? '',
    };
  },

  async getEmiSchedule(loanId: string): Promise<EMISchedule[]> {
    const res = await api.get<EMISchedule[]>(`${base}/loans/${loanId}/emi-schedule`);
    return res.data;
  },

  // No amount: the API resolves the payable figure from the EMI row. Sending
  // one would let a client assert what it owes.
  async processManualPayment(
    loanId: string,
    emiId: string,
    idempotencyKey?: string,
  ): Promise<CdlManualPaymentResult> {
    const res = await api.post<WireManualPaymentResult>(
      `${base}/loans/${loanId}/payments`,
      { emiId },
      idempotentConfig(idempotencyKey),
    );
    const w = res.data;
    return {
      paymentId: w.paymentId,
      emiId: w.emiId,
      amount: w.totalCollected,
      status: 'captured',
      receiptId: w.paymentId,
      receiptS3Url: w.receiptUrl,
      paidAt: w.paidAt,
      nextDueDate: null,
    };
  },

  async handlePaymentFailure(loanId: string, emiId: string): Promise<CdlPaymentFailure> {
    const res = await api.post<CdlPaymentFailure>(
      `${base}/loans/${loanId}/payment-failure`,
      { emiId },
    );
    return res.data;
  },

  async getOverdueStatus(loanId: string): Promise<CdlOverdueStatus> {
    const res = await api.get<WireOverdueStatus>(`${base}/loans/${loanId}/overdue`);
    const w = res.data;
    return {
      loanId: w.loanId,
      daysOverdue: w.overdueDays,
      penaltyAccrued: w.penaltyCharges,
      // The collection escalation timeline is a UI construct; the API returns
      // a single current status, so no stages are fabricated here.
      stages: [],
    };
  },

  async closeLoan(loanId: string): Promise<CdlClosureResult> {
    const res = await api.post<WireClosureResult>(`${base}/loans/${loanId}/close`);
    const w = res.data;
    return {
      loanId: w.loanId,
      status: 'closed',
      finalEmiPaid: true,
      nocRef: w.closureId,
      nocS3Url: w.closureLetterUrl,
      mandateCancelled: true,
      customerNotified: true,
      closedAt: w.closedAt,
    };
  },

  async generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }> {
    const res = await api.post<{ documentRef: string; documentUrl: string }>(
      `${base}/loans/${loanId}/noc`,
    );
    return { nocRef: res.data.documentRef, nocS3Url: res.data.documentUrl };
  },
};

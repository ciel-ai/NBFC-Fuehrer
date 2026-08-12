import { mockDelay } from '../../api/api';
import type { DocumentUploadResult } from '@/src/entities/document';
import { calculateEMI } from '@/src/core/utils/formatters';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import {
  cdlAutoDebitLabel,
  cdlCalculateFoir,
  cdlProcessingFee,
  evaluateCdlApplication,
  CDL_DEFAULT_AUTO_DEBIT_DATE,
  CDL_DEFAULT_INTEREST_RATE,
  CDL_FOIR_MAX,
  CDL_FOIR_REJECT,
  CDL_MAX_LOAN_AMOUNT,
} from '@/src/entities/consumerDurableLoan';
import type {
  CdlAgentReviewDecision,
  CdlAgreementResult,
  CdlApplicationInput,
  CdlApplicationResult,
  CdlClosureResult,
  CdlComplianceResult,
  CdlCreditAssessment,
  CdlCreditDecision,
  CdlDisbursalResult,
  CdlFoirInput,
  CdlKycResult,
  CdlManualPaymentResult,
  CdlNachResult,
  CdlOverdueStatus,
  CdlPaymentFailure,
  CdlQuoteResult,
} from '@/src/entities/consumerDurableLoan';
import type { IConsumerDurableLoanService } from '../interfaces/IConsumerDurableLoanService';
import {
  addRuntimeLoan,
  generateCdlSchedule,
  getRuntimeLoan,
  getRuntimeSchedule,
  updateRuntimeLoan,
} from './mockLoanStore';

const ref = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;

/**
 * Stand-in bureau score. Bands are chosen to exercise all four 4.2 outcomes in
 * the demo: auto-approve (≥750), manual review (700–749) and reject (<700).
 */
function mockCibilFor(monthlyIncome: number): number {
  if (monthlyIncome >= 60000) return 780; // auto approve
  if (monthlyIncome >= 40000) return 762; // auto approve
  if (monthlyIncome >= 28000) return 720; // manual review
  return 668;                             // reject
}

/**
 * Application facts the server holds and the client no longer sends. Set on
 * submitApplication, read by the credit assessment/decision mocks — the mock
 * equivalent of the API reading its own loan_applications row.
 */
let lastSubmitted: {
  loanAmount: number;
  employmentType: string;
  tenureMonths: number;
} | null = null;

export const mockConsumerDurableLoanService: IConsumerDurableLoanService = {
  // Mirrors the API's /quote: EMI and fee come from the shared CDL policy
  // module, never from a formula local to a screen.
  async getQuote(input): Promise<CdlQuoteResult> {
    const interestRate = input.interestRate ?? CDL_DEFAULT_INTEREST_RATE;
    const emi = calculateEMI(input.loanAmount, interestRate, input.tenureMonths);
    const processingFee = cdlProcessingFee(input.loanAmount);
    // Mock-only approximation (emi * tenureMonths) — fine here since the
    // mock is never the source of truth for a real loan. The real service
    // must never do this; see cdlLoansService.quote on the backend, which
    // sums the actual amortization schedule instead.
    const totalPayable = Math.round(emi * input.tenureMonths * 100) / 100;
    return mockDelay(
      {
        loanAmount: input.loanAmount,
        tenureMonths: input.tenureMonths,
        interestRate,
        emi,
        processingFee,
        processingFeeGst: Math.round(processingFee * 0.18),
        totalInterest: Math.max(0, Math.round((totalPayable - input.loanAmount) * 100) / 100),
        totalAmount: totalPayable,
        maxEligibleAmount: Math.min(
          input.productValue - input.downPayment,
          CDL_MAX_LOAN_AMOUNT,
        ),
      },
      250,
    );
  },

  async submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult> {
    const interestRate = input.interestRate ?? CDL_DEFAULT_INTEREST_RATE;
    // The canonical credit-assessment/decision requests carry only income
    // fields — the server reads the loan amount and employment type back from
    // the application row. The mock remembers them here for the same reason,
    // so both paths decide on server-held facts rather than client assertions.
    lastSubmitted = {
      loanAmount: input.loanAmount,
      employmentType: input.employmentType,
      tenureMonths: input.tenureMonths,
    };
    return mockDelay(
      {
        applicationId: ref('CDL-APP'),
        status: 'submitted',
        productName: input.productName,
        amount: input.loanAmount,
        tenure: input.tenureMonths,
        // The API computes the EMI; the mock does the same rather than
        // echoing one back, since the canonical request no longer carries it.
        emi: calculateEMI(input.loanAmount, interestRate, input.tenureMonths),
        interestRate,
      },
      1200,
    );
  },

  async uploadDocument(
    applicationId: string,
    uri: string,
    type: string,
  ): Promise<DocumentUploadResult> {
    return mockDelay({
      documentId: ref('CDL-DOC'),
      applicationId,
      type,
      url: 'https://mock.fuehrer.in/docs/' + applicationId + '/' + type + '.jpg',
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
    }, 900);
  },

  async runKycChecks(applicationId: string): Promise<CdlKycResult> {
    return mockDelay(
      {
        applicationId,
        status: 'completed',
        checks: [
          { label: 'Aadhaar verification', provider: 'Perfios', status: 'passed', detail: 'UIDAI OTP confirmed' },
          { label: 'PAN authentication', provider: 'Perfios', status: 'passed', detail: 'Active · Individual' },
          { label: 'PAN–Aadhaar linkage', provider: 'Perfios', status: 'passed', detail: 'Linked' },
          { label: 'Selfie + liveness', provider: 'Perfios Silent Liveness', status: 'passed', detail: 'Live face detected' },
          { label: 'Face match', provider: 'Perfios Face Match', status: 'passed', detail: '96% match vs Aadhaar' },
          { label: 'Name similarity', provider: 'Perfios', status: 'passed', detail: '98% match' },
          { label: 'Bank account verification', provider: 'Perfios Bank Verify', status: 'passed', detail: 'Penny-drop verified' },
        ],
      },
      1600,
    );
  },

  async runComplianceChecks(applicationId: string): Promise<CdlComplianceResult> {
    return mockDelay(
      {
        applicationId,
        overall: 'passed',
        checks: [
          { label: 'AML sanctions screening', provider: 'Perfios AML', status: 'passed' },
          { label: 'PEP verification', provider: 'Perfios PEP', status: 'passed' },
          { label: 'Bank defaulter database', provider: 'Perfios Defaulters', status: 'passed' },
          { label: 'Alerts / watchlist screening', provider: 'Perfios Alerts', status: 'passed' },
        ],
      },
      1500,
    );
  },

  calculateFOIR(input: CdlFoirInput): number {
    return cdlCalculateFoir(input);
  },

  // Canonical input: the three income fields the API actually accepts. The
  // score, age band and loan ceiling are server-derived — the mock derives
  // them here for the same reason, so the mock and live paths agree on what a
  // client is allowed to assert.
  async runCreditAssessment(applicationId, input): Promise<CdlCreditAssessment> {
    const monthlyIncome = input.monthlyIncome || 0;
    const existingObligations = input.existingEmis;
    const foir = cdlCalculateFoir({
      monthlyIncome,
      existingObligations,
      proposedEmi: input.proposedEmi,
    });
    const foirStatus: CdlCreditAssessment['foirStatus'] =
      foir > CDL_FOIR_REJECT ? 'failed' : foir > CDL_FOIR_MAX ? 'flagged' : 'passed';

    return mockDelay(
      {
        applicationId,
        employmentVerified: true,
        employmentType: '',
        annualIncome: monthlyIncome * 12,
        monthlyIncome,
        cibilScore: mockCibilFor(monthlyIncome),
        existingObligations,
        proposedEmi: input.proposedEmi,
        foir,
        foirLimit: CDL_FOIR_MAX,
        foirStatus,
      },
      1700,
    );
  },

  // Canonical input — the same three income fields as the assessment. The
  // decision inputs the API does not accept from a client (CIBIL score, age,
  // customer type, loan ceiling) are derived here, matching the live path
  // where the server reads them from the application and the bureau record.
  async getCreditDecision(applicationId, input): Promise<CdlCreditDecision> {
    // The full 4.1–4.4 matrix lives in the policy module.
    const loanAmount = lastSubmitted?.loanAmount ?? 0;
    const result = evaluateCdlApplication({
      customerType: (lastSubmitted?.employmentType ?? 'SALARIED').toLowerCase(),
      age: undefined,
      monthlyIncome: input.monthlyIncome,
      existingObligations: input.existingEmis,
      proposedEmi: input.proposedEmi,
      loanAmount,
      cibilScore: mockCibilFor(input.monthlyIncome),
    });

    return mockDelay(
      {
        applicationId,
        decision: result.outcome,
        cibilScore: result.cibilScore,
        foir: result.foir,
        approvedAmount: result.outcome === 'rejected' ? 0 : loanAmount,
        reason: result.summary,
        reasons: result.reasons,
        requiresAgentReview: result.outcome === 'flagged',
      },
      1400,
    );
  },

  async submitAgentReviewDecision(_decision: CdlAgentReviewDecision): Promise<void> {
    await mockDelay(null, 900);
  },

  // No body — the API reads the approved terms from the application row.
  async generateAgreement(applicationId): Promise<CdlAgreementResult> {
    const loanAmount = lastSubmitted?.loanAmount ?? 0;
    const tenure = lastSubmitted?.tenureMonths ?? 0;
    return mockDelay(
      {
        agreementId: ref('CDL-AGR'),
        status: 'completed',
        stampRef: ref('NESL'),
        esignRef: ref('EMD'),
        s3Url: `s3://fuehrer-agreements/${applicationId}.pdf`,
        amount: loanAmount,
        tenure,
        emi: tenure ? calculateEMI(loanAmount, CDL_DEFAULT_INTEREST_RATE, tenure) : 0,
        interestRate: CDL_DEFAULT_INTEREST_RATE,
      },
      1300,
    );
  },

  async registerNachMandate(_applicationId, input): Promise<CdlNachResult> {
    const tenure = lastSubmitted?.tenureMonths ?? 0;
    return mockDelay(
      {
        mandateId: ref('RP-NACH'),
        status: 'completed',
        debitDate: cdlAutoDebitLabel(input.preferredDebitDay ?? CDL_DEFAULT_AUTO_DEBIT_DATE),
        emi: tenure
          ? calculateEMI(lastSubmitted?.loanAmount ?? 0, CDL_DEFAULT_INTEREST_RATE, tenure)
          : 0,
        // Masking is a display concern — the mock echoes what was actually sent.
        bankAccount: input.bankAccount,
      },
      1400,
    );
  },

  // Activation is part of disbursal now — POST /loans (activateLoan) was
  // removed from the API, which transitions DISBURSED → ACTIVE itself on
  // payout confirmation. The schedule/runtime-loan setup that used to live in
  // activateLoan happens here so the mock flow matches that behaviour.
  async disburseToMerchant(_applicationId, input): Promise<CdlDisbursalResult> {
    const seq = Date.now().toString().slice(-5);
    const loanAccountId = `CDL-2026-${seq}`;
    const disbursedAt = new Date();
    const rate = CDL_DEFAULT_INTEREST_RATE;
    const tenure = lastSubmitted?.tenureMonths ?? 0;
    const principal = lastSubmitted?.loanAmount ?? input.amount;

    if (tenure > 0) {
      const schedule = generateCdlSchedule(
        loanAccountId,
        principal,
        tenure,
        disbursedAt,
        rate,
        CDL_DEFAULT_AUTO_DEBIT_DATE,
      );
      const loan: Loan = {
        id: loanAccountId,
        type: 'consumer_durable',
        amount: principal,
        emi: calculateEMI(principal, rate, tenure),
        tenure,
        status: 'active',
        disbursedAt: disbursedAt.toISOString().slice(0, 10),
        nextDueDate: schedule[0]?.dueDate ?? disbursedAt.toISOString().slice(0, 10),
        outstandingAmount: principal,
        applicationStatus: 'repayment',
        bankAccount: input.merchantName,
      };
      addRuntimeLoan(loan, schedule);
    }

    return mockDelay(
      {
        payoutId: ref('RP-PAYOUT'),
        status: 'completed',
        amount: input.amount,
        merchantName: input.merchantName,
        loanAccountId,
        disbursedAt: disbursedAt.toISOString(),
      },
      1500,
    );
  },

  async getEmiSchedule(loanId: string): Promise<EMISchedule[]> {
    return mockDelay(getRuntimeSchedule(loanId) ?? [], 500);
  },

  async processManualPayment(loanId: string, emiId: string): Promise<CdlManualPaymentResult> {
    const schedule = getRuntimeSchedule(loanId);
    const emi = schedule?.find((e) => e.id === emiId) ?? schedule?.find((e) => e.status !== 'paid');
    const amount = emi?.amount ?? 0;

    if (emi) emi.status = 'paid';
    const next = schedule?.find((e) => e.status !== 'paid');
    const loan = getRuntimeLoan(loanId);
    if (loan) {
      updateRuntimeLoan(loanId, {
        outstandingAmount: Math.max(0, loan.outstandingAmount - (emi?.principal ?? 0)),
        nextDueDate: next?.dueDate ?? loan.nextDueDate,
      });
    }

    return mockDelay(
      {
        paymentId: ref('RP-PAY'),
        emiId: emi?.id ?? emiId,
        amount,
        status: 'captured',
        receiptId: ref('RCPT'),
        receiptS3Url: `s3://fuehrer-receipts/${loanId}/${emi?.id ?? emiId}.pdf`,
        paidAt: new Date().toISOString(),
        nextDueDate: next?.dueDate ?? null,
      },
      1600,
    );
  },

  async handlePaymentFailure(loanId: string, emiId: string): Promise<CdlPaymentFailure> {
    const schedule = getRuntimeSchedule(loanId);
    const failed = schedule?.find((e) => e.id === emiId) ?? schedule?.find((e) => e.status !== 'paid');
    const penalty = Math.round((failed?.amount ?? 0) * 0.02);

    // Penalty is folded into the NEXT EMI, not raised as a separate charge.
    if (failed) failed.status = 'overdue';
    const next = schedule?.find((e) => e.status === 'pending');
    if (next) next.amount += penalty;

    return mockDelay(
      {
        emiId: failed?.id ?? emiId,
        failureReason: 'NACH auto-debit returned (insufficient funds)',
        provider: 'Razorpay',
        retryScheduledAt: new Date(Date.now() + 3 * 864e5).toISOString(),
        penalty,
        nextEmiWithPenalty: next?.amount ?? (failed?.amount ?? 0) + penalty,
        alertSent: true,
      },
      1300,
    );
  },

  async getOverdueStatus(loanId: string): Promise<CdlOverdueStatus> {
    const daysOverdue = 7;
    return mockDelay(
      {
        loanId,
        daysOverdue,
        penaltyAccrued: 196,
        stages: [
          { day: 1, label: 'Overdue alert', description: 'SMS + push reminder sent via AWS SNS.', status: 'done' },
          { day: 7, label: 'Escalation initiated', description: 'Collections agent assigned; follow-up call scheduled.', status: 'active' },
          { day: 30, label: 'NPA workflow triggered', description: 'Account marked NPA per RBI norms.', status: 'pending' },
          { day: 30, label: 'Legal workflow', description: 'Legal notice auto-initiated by the recovery system.', status: 'pending' },
        ],
      },
      1000,
    );
  },

  async closeLoan(loanId: string): Promise<CdlClosureResult> {
    const schedule = getRuntimeSchedule(loanId);
    schedule?.forEach((e) => { e.status = 'paid'; });
    updateRuntimeLoan(loanId, { status: 'closed', outstandingAmount: 0 });

    return mockDelay(
      {
        loanId,
        status: 'closed',
        finalEmiPaid: true,
        nocRef: ref('NOC-CDL'),
        nocS3Url: `s3://fuehrer-noc/${loanId}.pdf`,
        mandateCancelled: true,
        customerNotified: true,
        closedAt: new Date().toISOString(),
      },
      1600,
    );
  },

  async generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }> {
    return mockDelay(
      { nocRef: ref('NOC-CDL'), nocS3Url: `s3://fuehrer-noc/${loanId}.pdf` },
      900,
    );
  },
};

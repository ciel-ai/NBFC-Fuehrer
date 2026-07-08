import { mockDelay } from '../../api/api';
import { calculateEMI } from '@/src/core/utils/formatters';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import {
  CDL_ANNUAL_INTEREST_RATE,
  CDL_CIBIL_APPROVE,
  CDL_CIBIL_REJECT,
  CDL_FOIR_LIMIT,
  CDL_FOIR_REJECT,
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

function mockCibilFor(monthlyIncome: number): number {
  if (monthlyIncome >= 60000) return 780;
  if (monthlyIncome >= 40000) return 730;
  if (monthlyIncome >= 28000) return 690;
  return 630;
}

export const mockConsumerDurableLoanService: IConsumerDurableLoanService = {
  async submitApplication(input: CdlApplicationInput): Promise<CdlApplicationResult> {
    return mockDelay(
      {
        applicationId: ref('CDL-APP'),
        status: 'submitted',
        productName: input.productName,
        amount: input.amount,
        tenure: input.tenure,
        emi: input.emi,
        interestRate: CDL_ANNUAL_INTEREST_RATE,
      },
      1200,
    );
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
    if (input.monthlyIncome <= 0) return 0;
    const ratio = ((input.existingObligations + input.proposedEmi) / input.monthlyIncome) * 100;
    return Math.round(ratio * 10) / 10;
  },

  async runCreditAssessment(applicationId, input): Promise<CdlCreditAssessment> {
    const monthlyIncome = input.monthlyIncome || 0;
    const existingObligations = Math.round(monthlyIncome * 0.15);
    const foir = this.calculateFOIR({
      monthlyIncome,
      existingObligations,
      proposedEmi: input.proposedEmi,
    });
    const foirStatus: CdlCreditAssessment['foirStatus'] =
      foir > CDL_FOIR_REJECT ? 'failed' : foir > CDL_FOIR_LIMIT ? 'flagged' : 'passed';

    return mockDelay(
      {
        applicationId,
        employmentVerified: true,
        employmentType: input.employmentType || 'salaried',
        annualIncome: monthlyIncome * 12,
        monthlyIncome,
        cibilScore: mockCibilFor(monthlyIncome),
        existingObligations,
        proposedEmi: input.proposedEmi,
        foir,
        foirLimit: CDL_FOIR_LIMIT,
        foirStatus,
      },
      1700,
    );
  },

  async getCreditDecision(applicationId, assessment): Promise<CdlCreditDecision> {
    const { cibilScore, foir } = assessment;
    let decision: CdlCreditDecision['decision'];
    let reason: string;

    if (cibilScore < CDL_CIBIL_REJECT || foir > CDL_FOIR_REJECT) {
      decision = 'rejected';
      reason = `Declined: CIBIL ${cibilScore} / FOIR ${foir}% breach the minimum risk thresholds.`;
    } else if (cibilScore >= CDL_CIBIL_APPROVE && foir <= CDL_FOIR_LIMIT) {
      decision = 'approved';
      reason = `Auto-approved: CIBIL ${cibilScore} ≥ ${CDL_CIBIL_APPROVE} and FOIR ${foir}% ≤ ${CDL_FOIR_LIMIT}%.`;
    } else {
      decision = 'flagged';
      reason = `Flagged for agent review: CIBIL ${cibilScore} / FOIR ${foir}% fall in the manual-review band.`;
    }

    return mockDelay(
      {
        applicationId,
        decision,
        cibilScore,
        foir,
        approvedAmount: assessment.proposedEmi * 0, // overwritten by caller's amount
        reason,
        requiresAgentReview: decision === 'flagged',
      },
      1400,
    );
  },

  async submitAgentReviewDecision(_decision: CdlAgentReviewDecision): Promise<void> {
    await mockDelay(null, 900);
  },

  async generateAgreement(applicationId, input): Promise<CdlAgreementResult> {
    return mockDelay(
      {
        agreementId: ref('CDL-AGR'),
        status: 'completed',
        stampRef: ref('NESL'),
        esignRef: ref('EMD'),
        s3Url: `s3://fuehrer-agreements/${applicationId}.pdf`,
        amount: input.amount,
        tenure: input.tenure,
        emi: input.emi,
        interestRate: CDL_ANNUAL_INTEREST_RATE,
      },
      1300,
    );
  },

  async registerNachMandate(_applicationId, input): Promise<CdlNachResult> {
    return mockDelay(
      {
        mandateId: ref('RP-NACH'),
        status: 'completed',
        debitDate: '5th of every month',
        emi: input.emi,
        bankAccount: input.bankAccount,
      },
      1400,
    );
  },

  async disburseToMerchant(_applicationId, input): Promise<CdlDisbursalResult> {
    const seq = Date.now().toString().slice(-5);
    return mockDelay(
      {
        payoutId: ref('RP-PAYOUT'),
        status: 'completed',
        amount: input.amount,
        merchantName: input.merchantName,
        loanAccountId: `CDL-2026-${seq}`,
        disbursedAt: new Date().toISOString(),
      },
      1500,
    );
  },

  async activateLoan(input): Promise<Loan> {
    const disbursedAt = new Date();
    const schedule = generateCdlSchedule(input.loanAccountId, input.amount, input.tenure, disbursedAt);
    const emi = calculateEMI(input.amount, CDL_ANNUAL_INTEREST_RATE, input.tenure);
    const loan: Loan = {
      id: input.loanAccountId,
      type: 'consumer_durable',
      amount: input.amount,
      emi,
      tenure: input.tenure,
      status: 'active',
      disbursedAt: disbursedAt.toISOString().slice(0, 10),
      nextDueDate: schedule[0]?.dueDate ?? disbursedAt.toISOString().slice(0, 10),
      outstandingAmount: input.amount,
      applicationStatus: 'repayment',
      bankAccount: input.merchantName ?? 'Merchant payout',
    };
    addRuntimeLoan(loan, schedule);
    return mockDelay(loan, 600);
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

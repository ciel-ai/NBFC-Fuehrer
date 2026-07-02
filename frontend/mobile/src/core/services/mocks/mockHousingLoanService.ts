import { mockDelay } from '../../api/api';
import { calculateEMI } from '@/src/core/utils/formatters';
import type { EMISchedule, Loan } from '@/src/entities/loan';
import {
  HOUSING_FOIR_LIMIT,
  HOUSING_INTEREST_RATE,
  HOUSING_MAX_LTV,
} from '@/src/entities/housingLoan';
import type {
  HousingAgreementResult,
  HousingApplicant,
  HousingApplicationInput,
  HousingApplicationResult,
  HousingClosureResult,
  HousingComplianceResult,
  HousingCreditAssessment,
  HousingDecision,
  HousingDisbursalResult,
  HousingIncomeAssessment,
  HousingKycResult,
  HousingNachResult,
  HousingOverdueStatus,
  HousingPmaySubsidyResult,
  HousingPrepaymentQuote,
  HousingPrepaymentResult,
  HousingPropertyAssessment,
} from '@/src/entities/housingLoan';
import type { IHousingLoanService } from '../interfaces/IHousingLoanService';
import {
  addRuntimeLoan,
  generateCdlSchedule,
  getRuntimeLoan,
  getRuntimeSchedule,
  setRuntimeSchedule,
  updateRuntimeLoan,
} from './mockLoanStore';

const ref = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`;

function kycChecks(): HousingKycResult['checks'] {
  return [
    { label: 'Aadhaar verification', provider: 'Perfios', status: 'passed', detail: 'UIDAI OTP confirmed' },
    { label: 'PAN authentication', provider: 'Perfios', status: 'passed', detail: 'Active · Individual' },
    { label: 'Face verification', provider: 'Perfios Face Match', status: 'passed', detail: '95% match' },
    { label: 'Bank account verification', provider: 'Perfios Bank Verify', status: 'passed', detail: 'Penny-drop verified' },
  ];
}

export const mockHousingLoanService: IHousingLoanService = {
  async submitApplication(input: HousingApplicationInput): Promise<HousingApplicationResult> {
    return mockDelay(
      {
        applicationId: ref('HL-APP'),
        status: 'submitted',
        amount: input.amount,
        tenure: input.tenure,
        interestRate: HOUSING_INTEREST_RATE,
        emi: calculateEMI(input.amount, HOUSING_INTEREST_RATE, input.tenure * 12),
      },
      1100,
    );
  },

  async runKyc(applicationId: string, applicant: HousingApplicant): Promise<HousingKycResult> {
    return mockDelay({ applicationId, applicant, status: 'completed', checks: kycChecks() }, 1500);
  },

  async runCompliance(applicationId: string): Promise<HousingComplianceResult> {
    const checks = [
      { label: 'AML sanctions screening', provider: 'Perfios AML', status: 'passed' as const },
      { label: 'PEP verification', provider: 'Perfios PEP', status: 'passed' as const },
      { label: 'Bank defaulter database', provider: 'Perfios Defaulters', status: 'passed' as const },
      { label: 'Alerts / watchlist', provider: 'Perfios Alerts', status: 'passed' as const },
    ];
    return mockDelay(
      {
        applicationId,
        overall: 'passed',
        applicants: [
          { applicant: 'primary', name: 'Primary applicant', checks },
          { applicant: 'co', name: 'Co-applicant', checks },
        ],
      },
      1600,
    );
  },

  async runIncomeAssessment(applicationId, input): Promise<HousingIncomeAssessment> {
    const combined = input.primaryMonthlyIncome + input.coApplicantMonthlyIncome;
    return mockDelay(
      {
        applicationId,
        itrYearsParsed: 2,
        avgAnnualProfit: 1200000,
        gstinVerified: !!input.gstin,
        gstFilingMonths: 24,
        businessVintageYears: 5,
        primaryMonthlyIncome: input.primaryMonthlyIncome,
        coApplicantMonthlyIncome: input.coApplicantMonthlyIncome,
        combinedMonthlyIncome: combined,
      },
      1700,
    );
  },

  async runCreditAssessment(applicationId, input): Promise<HousingCreditAssessment> {
    const existingObligations = Math.round(input.combinedMonthlyIncome * 0.1);
    const foir = input.combinedMonthlyIncome > 0
      ? Math.round(((existingObligations + input.emiEstimate) / input.combinedMonthlyIncome) * 1000) / 10
      : 0;
    const foirStatus: HousingCreditAssessment['foirStatus'] =
      foir > 60 ? 'failed' : foir > HOUSING_FOIR_LIMIT ? 'flagged' : 'passed';
    return mockDelay(
      {
        applicationId,
        primaryCibil: 738,
        coApplicantCibil: input.hasCoApplicant ? 712 : null,
        emiEstimate: input.emiEstimate,
        existingObligations,
        combinedMonthlyIncome: input.combinedMonthlyIncome,
        foir,
        foirLimit: HOUSING_FOIR_LIMIT,
        foirStatus,
      },
      1700,
    );
  },

  async runPropertyAssessment(applicationId, input): Promise<HousingPropertyAssessment> {
    const ltv = input.agreementValue > 0
      ? Math.round((input.loanAmount / input.agreementValue) * 100)
      : 0;
    const ltvWithinPolicy = ltv <= HOUSING_MAX_LTV;
    const encumbranceFound = false; // CERSAI clear in the happy path
    const negativeArea = false;

    let outcome: HousingPropertyAssessment['outcome'] = 'pass';
    let rejectionReason: string | undefined;
    if (!ltvWithinPolicy) {
      outcome = 'reject';
      rejectionReason = `LTV ${ltv}% exceeds the ${HOUSING_MAX_LTV}% policy cap.`;
    } else if (negativeArea) {
      outcome = 'reject';
      rejectionReason = 'Property falls in a negative / blacklisted area.';
    } else if (encumbranceFound) {
      outcome = 'review';
      rejectionReason = 'CERSAI encumbrance found — routed to agent review.';
    }

    return mockDelay(
      {
        applicationId,
        cersaiStatus: encumbranceFound ? 'failed' : 'passed',
        encumbranceFound,
        legalStatus: 'review',
        technicalValuation: input.agreementValue,
        ltv,
        ltvWithinPolicy,
        negativeArea,
        pmayEligible: true,
        pmaySubsidy: 267280,
        outcome,
        rejectionReason,
      },
      1800,
    );
  },

  async submitForReview(): Promise<void> {
    await mockDelay(null, 800);
  },

  async getCommitteeDecision(applicationId, input): Promise<HousingDecision> {
    // Mandatory manual review — mock returns an approval from the committee.
    return mockDelay(
      {
        applicationId,
        decision: 'approved',
        reviewer: 'Credit Committee',
        sanctionedAmount: input.amount,
        emi: input.emi,
        note: 'Approved subject to eSign by both applicants.',
      },
      1400,
    );
  },

  async generateAgreement(applicationId, input): Promise<HousingAgreementResult> {
    return mockDelay(
      {
        agreementId: ref('HL-AGR'),
        status: 'in_progress',
        stampRef: ref('NESL'),
        stampDuty: Math.round(input.amount * 0.05), // higher stamp duty for housing
        s3Url: `s3://fuehrer-agreements/${applicationId}.pdf`,
        amount: input.amount,
        tenure: input.tenure,
        emi: input.emi,
      },
      1300,
    );
  },

  async eSign(applicationId, applicant): Promise<HousingAgreementResult> {
    const base = {
      agreementId: ref('HL-AGR'),
      stampRef: ref('NESL'),
      stampDuty: 0,
      s3Url: `s3://fuehrer-agreements/${applicationId}.pdf`,
      amount: 0,
      tenure: 0,
      emi: 0,
    };
    return mockDelay(
      {
        ...base,
        status: 'completed',
        primaryEsignRef: ref('EMD-P'),
        coApplicantEsignRef: applicant === 'co' ? ref('EMD-C') : undefined,
      },
      1100,
    );
  },

  async registerNach(_applicationId, input): Promise<HousingNachResult> {
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

  async applyPmaySubsidy(applicationId, input): Promise<HousingPmaySubsidyResult> {
    const subsidy = 267280;
    return mockDelay(
      {
        applicationId,
        subsidyAmount: subsidy,
        status: 'credited',
        nhbRef: ref('NHB-PMAY'),
        originalLoan: input.loanAmount,
        effectiveLoanBurden: Math.max(0, input.loanAmount - subsidy),
      },
      1500,
    );
  },

  async disburseToBuilder(_applicationId, input): Promise<HousingDisbursalResult> {
    const seq = Date.now().toString().slice(-5);
    return mockDelay(
      {
        payoutId: ref('RP-PAYOUT'),
        status: 'completed',
        amount: input.amount,
        builderName: input.builderName,
        builderAccount: 'ESCROW ****8842',
        loanAccountId: `HL-2026-${seq}`,
        disbursedAt: new Date().toISOString(),
      },
      1600,
    );
  },

  async activateLoan(input): Promise<Loan> {
    const disbursedAt = new Date();
    const schedule = generateCdlSchedule(
      input.loanAccountId,
      input.amount,
      input.tenure * 12,
      disbursedAt,
      HOUSING_INTEREST_RATE,
    );
    const emi = calculateEMI(input.amount, HOUSING_INTEREST_RATE, input.tenure * 12);
    const loan: Loan = {
      id: input.loanAccountId,
      type: 'affordable_housing',
      amount: input.amount,
      emi,
      tenure: input.tenure * 12,
      status: 'active',
      disbursedAt: disbursedAt.toISOString().slice(0, 10),
      nextDueDate: schedule[0]?.dueDate ?? disbursedAt.toISOString().slice(0, 10),
      outstandingAmount: input.amount,
      applicationStatus: 'repayment',
      bankAccount: `${input.builderName} (builder)`,
    };
    addRuntimeLoan(loan, schedule);
    return mockDelay(loan, 600);
  },

  async getEmiSchedule(loanId: string): Promise<EMISchedule[]> {
    return mockDelay(getRuntimeSchedule(loanId) ?? [], 500);
  },

  async getPrepaymentQuote(loanId: string, prepaymentAmount: number): Promise<HousingPrepaymentQuote> {
    const loan = getRuntimeLoan(loanId);
    const schedule = getRuntimeSchedule(loanId) ?? [];
    const pendingCount = schedule.filter((e) => e.status !== 'paid').length || (loan?.tenure ?? 240);
    const outstanding = loan?.outstandingAmount ?? 0;
    const newOutstanding = Math.max(0, outstanding - prepaymentAmount);
    const currentEmi = loan?.emi ?? 0;

    // Reduce-tenure: keep EMI, solve for shorter tenure.
    const monthlyRate = HOUSING_INTEREST_RATE / 12 / 100;
    let newTenureMonths = pendingCount;
    if (currentEmi > newOutstanding * monthlyRate && newOutstanding > 0) {
      newTenureMonths = Math.ceil(
        Math.log(currentEmi / (currentEmi - newOutstanding * monthlyRate)) / Math.log(1 + monthlyRate),
      );
    } else if (newOutstanding === 0) {
      newTenureMonths = 0;
    }

    // Reduce-EMI: keep tenure, lower the instalment.
    const newEmi = newOutstanding > 0 ? calculateEMI(newOutstanding, HOUSING_INTEREST_RATE, pendingCount) : 0;

    return mockDelay(
      {
        loanId,
        outstandingPrincipal: outstanding,
        prepaymentAmount,
        newOutstanding,
        currentTenureMonths: pendingCount,
        currentEmi,
        reduceTenureOption: { newTenureMonths, emi: currentEmi },
        reduceEmiOption: { tenureMonths: pendingCount, newEmi },
      },
      900,
    );
  },

  async processPrepayment(loanId, input): Promise<HousingPrepaymentResult> {
    const quote = await this.getPrepaymentQuote(loanId, input.prepaymentAmount);
    const newTenure = input.option === 'reduce_tenure' ? quote.reduceTenureOption.newTenureMonths : quote.currentTenureMonths;
    const newEmi = input.option === 'reduce_tenure' ? quote.currentEmi : quote.reduceEmiOption.newEmi;

    const schedule = generateCdlSchedule(loanId, quote.newOutstanding, newTenure, new Date(), HOUSING_INTEREST_RATE);
    setRuntimeSchedule(loanId, schedule);
    updateRuntimeLoan(loanId, {
      outstandingAmount: quote.newOutstanding,
      tenure: newTenure,
      emi: newEmi,
      nextDueDate: schedule[0]?.dueDate,
    });

    return mockDelay(
      {
        loanId,
        paymentId: ref('RP-PAY'),
        option: input.option,
        newOutstanding: quote.newOutstanding,
        newTenureMonths: newTenure,
        newEmi,
      },
      1500,
    );
  },

  async getOverdueStatus(loanId: string): Promise<HousingOverdueStatus> {
    return mockDelay(
      {
        loanId,
        daysOverdue: 30,
        penaltyAccrued: 1680,
        stages: [
          { day: 1, label: 'Overdue alert', description: 'SMS + push reminder sent (AWS SNS).', status: 'done' },
          { day: 7, label: 'Follow-up & escalation', description: 'Collections agent assigned.', status: 'done' },
          { day: 30, label: 'Legal notice issued', description: 'SARFAESI legal notice auto-generated.', status: 'active' },
          { day: 90, label: 'Property attachment', description: 'Attachment process per RBI/SARFAESI guidelines.', status: 'pending' },
        ],
      },
      1000,
    );
  },

  async closeLoan(loanId: string): Promise<HousingClosureResult> {
    const schedule = getRuntimeSchedule(loanId);
    schedule?.forEach((e) => { e.status = 'paid'; });
    updateRuntimeLoan(loanId, { status: 'closed', outstandingAmount: 0 });
    return mockDelay(
      {
        loanId,
        status: 'closed',
        finalEmiPaid: true,
        propertyDocsReleased: true,
        nocRef: ref('NOC-HL'),
        nocS3Url: `s3://fuehrer-noc/${loanId}.pdf`,
        mandateCancelled: true,
        customerNotified: true,
        closedAt: new Date().toISOString(),
      },
      1600,
    );
  },

  async generateNoc(loanId: string): Promise<{ nocRef: string; nocS3Url: string }> {
    return mockDelay({ nocRef: ref('NOC-HL'), nocS3Url: `s3://fuehrer-noc/${loanId}.pdf` }, 900);
  },
};

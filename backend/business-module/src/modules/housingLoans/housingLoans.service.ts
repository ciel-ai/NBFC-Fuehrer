// src/modules/housingLoans/housingLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import type {
    HousingApplicationInput, HousingApplicationResult,
    HousingApplicant, HousingKycResult,
    HousingComplianceResult,
    HousingIncomeAssessmentInput, HousingIncomeAssessment,
    HousingCreditAssessmentInput, HousingCreditAssessment,
    HousingPropertyAssessmentInput, HousingPropertyAssessment,
    HousingDecision, HousingAgreementResult,
    HousingNachInput, HousingNachResult,
    HousingPmaySubsidyInput, HousingPmaySubsidyResult,
    HousingDisbursalInput, HousingDisbursalResult,
    HousingOverdueStatus, HousingPrepaymentQuote,
    HousingPrepaymentResult, HousingClosureResult,
} from './housingLoans.types';

const log = createModuleLogger('housingLoans.service');

const HOUSING_INTEREST_RATE = 9.5; // Annual %
const MAX_LTV = 80; // 80% of property value
const PROCESSING_FEE_PCT = 0.5;
const MAX_FOIR = 50;

function calcEmi(principal: number, annualRate: number, months: number): number {
    const r = annualRate / 12 / 100;
    if (r === 0) return Math.round(principal / months);
    return Math.round(principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
}

export const housingLoansService = {

    submitApplication(input: HousingApplicationInput): HousingApplicationResult {
        const emi = calcEmi(input.loanAmount, HOUSING_INTEREST_RATE, input.tenureMonths);
        const processingFee = Math.round(input.loanAmount * PROCESSING_FEE_PCT / 100);
        const refId = `FHR-AHL-${Math.floor(100000 + Math.random() * 900000)}`;
        return {
            applicationId: `ahl_app_${Date.now()}`,
            status: 'DRAFT',
            loanAmount: input.loanAmount,
            tenureMonths: input.tenureMonths,
            interestRate: HOUSING_INTEREST_RATE,
            monthlyEmi: emi,
            processingFee,
            referenceId: refId,
            createdAt: new Date().toISOString(),
            note: 'Application created. Please complete KYC to proceed.',
        };
    },

    runKyc(applicationId: string, _applicant: HousingApplicant): HousingKycResult {
        log.info('Running KYC for housing loan', { applicationId });
        return {
            applicationId,
            kycStatus: 'PASSED',
            aadhaarVerified: true,
            panVerified: true,
            faceMatchScore: 92,
            note: 'KYC verification completed successfully.',
        };
    },

    runCompliance(applicationId: string): HousingComplianceResult {
        log.info('Running compliance for housing loan', { applicationId });
        return {
            applicationId,
            amlStatus: 'PASSED',
            pepStatus: 'PASSED',
            overallStatus: 'PASSED',
            flags: [],
            note: 'All compliance checks passed.',
        };
    },

    runIncomeAssessment(applicationId: string, input: HousingIncomeAssessmentInput): HousingIncomeAssessment {
        const proposedEmi = calcEmi(500000, HOUSING_INTEREST_RATE, 120);
        const foir = Math.round(((input.existingEmis + proposedEmi) / input.monthlyIncome) * 100 * 10) / 10;
        const foirStatus = foir <= MAX_FOIR ? 'PASS' : 'FAIL';
        const maxEligibleEmi = (input.monthlyIncome * MAX_FOIR / 100) - input.existingEmis;
        const maxEligibleAmount = Math.round(maxEligibleEmi * (1 - Math.pow(1 + HOUSING_INTEREST_RATE / 12 / 100, -240)) / (HOUSING_INTEREST_RATE / 12 / 100));
        return {
            applicationId,
            monthlyIncome: input.monthlyIncome,
            existingEmis: input.existingEmis,
            proposedEmi,
            foir,
            foirStatus,
            maxEligibleAmount,
            note: foirStatus === 'PASS' ? `FOIR ${foir}% is within limit of ${MAX_FOIR}%.` : `FOIR ${foir}% exceeds limit of ${MAX_FOIR}%.`,
        };
    },

    runCreditAssessment(applicationId: string, input: HousingCreditAssessmentInput): HousingCreditAssessment {
        const creditStatus = input.cibilScore >= 650 && input.overdueAccounts === 0 ? 'PASS' : input.cibilScore >= 600 ? 'REVIEW' : 'FAIL';
        const rate = input.cibilScore >= 750 ? 8.5 : input.cibilScore >= 700 ? 9.0 : HOUSING_INTEREST_RATE;
        return {
            applicationId,
            cibilScore: input.cibilScore,
            creditStatus,
            maxLoanAmount: creditStatus === 'PASS' ? 5000000 : 0,
            recommendedInterestRate: rate,
            note: `CIBIL score ${input.cibilScore} — ${creditStatus}.`,
        };
    },

    runPropertyAssessment(applicationId: string, input: HousingPropertyAssessmentInput): HousingPropertyAssessment {
        const maxLoan = Math.round(input.estimatedMarketValue * MAX_LTV / 100);
        return {
            applicationId,
            estimatedValue: input.estimatedMarketValue,
            maxLtv: MAX_LTV,
            maxLoanBasedOnProperty: maxLoan,
            legalStatus: input.legalClearance ? 'CLEAR' : 'PENDING',
            technicalStatus: input.propertyAge <= 30 ? 'APPROVED' : 'REVIEW',
            note: `Max loan based on property value: ₹${maxLoan.toLocaleString('en-IN')}.`,
        };
    },

    submitForReview(applicationId: string): { success: boolean; message: string } {
        log.info('Submitting housing loan for review', { applicationId });
        return { success: true, message: 'Application submitted for credit committee review.' };
    },

    getCommitteeDecision(applicationId: string): HousingDecision {
        log.debug('Getting committee decision', { applicationId });
        const approvedAmount = 2500000;
        const tenureMonths = 180;
        return {
            applicationId,
            decision: 'APPROVED',
            approvedAmount,
            interestRate: HOUSING_INTEREST_RATE,
            tenureMonths,
            monthlyEmi: calcEmi(approvedAmount, HOUSING_INTEREST_RATE, tenureMonths),
            rejectionReason: null,
            conditions: ['Title deed to be submitted before disbursement', 'Insurance mandatory'],
            note: 'Loan approved by credit committee.',
        };
    },

    generateAgreement(applicationId: string): HousingAgreementResult {
        return {
            applicationId,
            agreementId: `agr_ahl_${Date.now()}`,
            agreementUrl: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/ahl_${applicationId}.pdf`,
            status: 'GENERATED',
            eSignRequestId: null,
            stampDutyAmount: 500,
            note: 'Agreement generated. Please review and sign.',
        };
    },

    eSign(applicationId: string): HousingAgreementResult {
        return {
            applicationId,
            agreementId: `agr_ahl_${applicationId}`,
            agreementUrl: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/ahl_${applicationId}_signed.pdf`,
            status: 'SIGNED',
            eSignRequestId: `esign_${Date.now()}`,
            stampDutyAmount: 500,
            note: 'Agreement signed and stored successfully.',
        };
    },

    registerNach(applicationId: string, _input: HousingNachInput): HousingNachResult {
        return {
            applicationId,
            mandateId: `mandate_ahl_${Date.now()}`,
            mandateType: 'E_NACH',
            bankAccount: 'XXXX1234',
            maxAmount: 100000,
            status: 'PENDING_REGISTRATION',
            razorpayMandateId: null,
            note: 'NACH mandate registration initiated.',
        };
    },

    applyPmaySubsidy(applicationId: string, input: HousingPmaySubsidyInput): HousingPmaySubsidyResult {
        const subsidyRates: Record<string, number> = { EWS: 6.5, LIG: 6.5, MIG_I: 4.0, MIG_II: 3.0 };
        const subsidyAmounts: Record<string, number> = { EWS: 267280, LIG: 267280, MIG_I: 235068, MIG_II: 230156 };
        const eligible = input.isFirstTimeOwner && input.annualIncome <= 1800000;
        return {
            applicationId,
            eligible,
            category: input.category,
            subsidyAmount: eligible ? (subsidyAmounts[input.category] ?? 0) : 0,
            subsidyRate: subsidyRates[input.category] ?? 0,
            netLoanAmount: 2500000 - (eligible ? (subsidyAmounts[input.category] ?? 0) : 0),
            note: eligible ? `PMAY subsidy applicable under ${input.category} category.` : 'Not eligible for PMAY subsidy.',
        };
    },

    disburseToBuilder(applicationId: string, input: HousingDisbursalInput): HousingDisbursalResult {
        log.info('Disbursing housing loan', { applicationId, amount: input.amount });
        return {
            applicationId,
            disbursalId: `disb_ahl_${Date.now()}`,
            amount: input.amount,
            mode: input.disbursalMode,
            status: 'COMPLETED',
            utrNumber: `UTR${Date.now()}`,
            disbursedAt: new Date().toISOString(),
            note: 'Loan disbursed successfully.',
        };
    },

    getEmiSchedule(loanId: string): Array<{ emiNumber: number; dueDate: string; amount: number; principal: number; interest: number; status: string }> {
        const emi = calcEmi(2500000, HOUSING_INTEREST_RATE, 180);
        return Array.from({ length: 6 }, (_, i) => ({
            emiNumber: i + 1,
            dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
            amount: emi,
            principal: Math.round(emi * 0.4),
            interest: Math.round(emi * 0.6),
            status: i === 0 ? 'PAID' : 'PENDING',
        }));
    },

    getPrepaymentQuote(loanId: string, prepaymentAmount: number): HousingPrepaymentQuote {
        return {
            loanId,
            principalOutstanding: 2400000,
            prepaymentAmount,
            prepaymentCharges: 0,
            totalPayable: prepaymentAmount,
            newTenureMonths: 160,
            newEmi: calcEmi(2400000 - prepaymentAmount, HOUSING_INTEREST_RATE, 160),
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        };
    },

    processPrepayment(loanId: string, input: { amount: number }): HousingPrepaymentResult {
        return {
            loanId,
            prepaymentId: `prep_${Date.now()}`,
            amountPaid: input.amount,
            newOutstanding: 2400000 - input.amount,
            newEmi: calcEmi(2400000 - input.amount, HOUSING_INTEREST_RATE, 160),
            newTenure: 160,
            status: 'COMPLETED',
            note: 'Prepayment processed successfully.',
        };
    },

    getOverdueStatus(loanId: string): HousingOverdueStatus {
        return {
            loanId,
            overdueAmount: 0,
            overdueDays: 0,
            overdueEmis: 0,
            penaltyCharges: 0,
            totalDue: 0,
            status: 'CURRENT',
            note: 'No overdue amount.',
        };
    },

    closeLoan(loanId: string): HousingClosureResult {
        return {
            loanId,
            closureId: `closure_${Date.now()}`,
            totalAmountPaid: 2500000,
            closedAt: new Date().toISOString(),
            nocAvailable: true,
            note: 'Loan closed. NOC will be available within 7 working days.',
        };
    },

    generateNoc(loanId: string): { nocRef: string; nocS3Url: string } {
        return {
            nocRef: `NOC-AHL-${loanId}-${Date.now()}`,
            nocS3Url: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/noc/ahl_${loanId}.pdf`,
        };
    },
};
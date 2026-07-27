// src/modules/cdlLoans/cdlLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { env } from '@/config/env';
import { computeMonthlyEmi } from '@/modules/emi/emi.calculator';
import type {
    CdlApplicationInput, CdlApplicationResult,
    CdlKycResult, CdlComplianceResult,
    CdlCreditAssessmentInput, CdlCreditAssessment,
    CdlCreditDecision, CdlAgreementResult,
    CdlNachResult, CdlDisbursalResult,
    CdlOverdueStatus, CdlClosureResult,
} from './cdlLoans.types';

const log = createModuleLogger('cdlLoans.service');

const CDL_INTEREST_RATE = 16.0;
const CDL_FOIR_LIMIT = 55;
const CDL_MIN_CIBIL = 650;

// Previously a local reimplementation using Math.round(), which can round
// DOWN - meaning the EMI estimate shown here (before disbursement) could be
// a few paise lower than the real EMI actually charged after disbursement
// (computeMonthlyEmi deliberately uses Math.ceil(), "customer never
// underpays by rounding"). Now uses the same authoritative calculation for
// both the estimate and the real, disbursed schedule, eliminating that
// discrepancy entirely.
const calcEmi = computeMonthlyEmi;

export const cdlLoansService = {

    submitApplication(input: CdlApplicationInput): CdlApplicationResult {
        const emi = calcEmi(input.loanAmount, CDL_INTEREST_RATE, input.tenureMonths);
        const processingFee = Math.round(input.loanAmount * 0.02);
        const refId = `FHR-CDL-${Math.floor(100000 + Math.random() * 900000)}`;
        return {
            applicationId: `cdl_app_${Date.now()}`,
            status: 'DRAFT',
            loanAmount: input.loanAmount,
            tenureMonths: input.tenureMonths,
            interestRate: CDL_INTEREST_RATE,
            monthlyEmi: emi,
            processingFee,
            referenceId: refId,
            createdAt: new Date().toISOString(),
            note: 'CDL application created successfully.',
        };
    },

    runKycChecks(applicationId: string): CdlKycResult {
        log.info('Running KYC for CDL', { applicationId });
        return {
            applicationId,
            kycStatus: 'PASSED',
            aadhaarVerified: true,
            panVerified: true,
            faceMatchScore: 94,
            note: 'KYC verification completed.',
        };
    },

    runComplianceChecks(applicationId: string): CdlComplianceResult {
        return {
            applicationId,
            amlStatus: 'PASSED',
            overallStatus: 'PASSED',
            note: 'Compliance checks passed.',
        };
    },

    runCreditAssessment(applicationId: string, input: CdlCreditAssessmentInput): CdlCreditAssessment {
        const foir = Math.round(((input.existingEmis + input.proposedEmi) / input.monthlyIncome) * 100 * 10) / 10;
        const foirStatus = foir <= CDL_FOIR_LIMIT ? 'PASS' : 'FAIL';
        const creditStatus = input.cibilScore >= CDL_MIN_CIBIL && foirStatus === 'PASS' ? 'PASS' : input.cibilScore >= 600 ? 'REVIEW' : 'FAIL';
        const maxEligibleEmi = (input.monthlyIncome * CDL_FOIR_LIMIT / 100) - input.existingEmis;
        const maxLoan = Math.round(maxEligibleEmi * (1 - Math.pow(1 + CDL_INTEREST_RATE / 12 / 100, -48)) / (CDL_INTEREST_RATE / 12 / 100));
        return {
            applicationId,
            cibilScore: input.cibilScore,
            foir,
            foirStatus,
            creditStatus,
            maxLoanAmount: creditStatus === 'PASS' ? maxLoan : 0,
            note: `CIBIL ${input.cibilScore}, FOIR ${foir}% â€” ${creditStatus}.`,
        };
    },

    getCreditDecision(applicationId: string, assessment: CdlCreditAssessment): CdlCreditDecision {
        const approved = assessment.creditStatus === 'PASS';
        return {
            applicationId,
            decision: approved ? 'APPROVED' : 'REJECTED',
            approvedAmount: approved ? assessment.maxLoanAmount : null,
            interestRate: approved ? CDL_INTEREST_RATE : null,
            monthlyEmi: approved ? calcEmi(assessment.maxLoanAmount, CDL_INTEREST_RATE, 12) : null,
            rejectionReason: approved ? null : 'CIBIL score or FOIR does not meet eligibility criteria.',
            note: approved ? 'CDL approved. Proceed to agreement.' : 'Application rejected.',
        };
    },

    generateAgreement(applicationId: string): CdlAgreementResult {
        return {
            applicationId,
            agreementId: `agr_cdl_${Date.now()}`,
            // Previously hardcoded the bucket name and region directly -
            // both are already configurable via AWS_S3_BUCKET/AWS_REGION
            // env vars used correctly elsewhere in the codebase. This
            // entire function is stub-only, gated behind stubGuard() at
            // the route level (CDL is not yet wired for real), so this
            // fake URL is never reachable in production regardless - fixed
            // for consistency, not because it was causing a live issue.
            agreementUrl: `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/agreements/cdl_${applicationId}.pdf`,
            status: 'GENERATED',
            eSignRequestId: null,
            note: 'Agreement generated. Please sign to proceed.',
        };
    },

    registerNachMandate(applicationId: string): CdlNachResult {
        return {
            applicationId,
            mandateId: `mandate_cdl_${Date.now()}`,
            mandateType: 'E_NACH',
            bankAccount: 'XXXX1234',
            maxAmount: 25000,
            status: 'PENDING_REGISTRATION',
            razorpayMandateId: null,
            note: 'NACH mandate initiated via Razorpay.',
        };
    },

    disburseToMerchant(applicationId: string, input: { merchantName: string; amount: number }): CdlDisbursalResult {
        log.info('Disbursing CDL to merchant', { applicationId });
        return {
            applicationId,
            disbursalId: `disb_cdl_${Date.now()}`,
            amount: input.amount,
            mode: 'UPI',
            merchantName: input.merchantName,
            status: 'COMPLETED',
            utrNumber: `UTR${Date.now()}`,
            disbursedAt: new Date().toISOString(),
            note: `â‚¹${input.amount.toLocaleString('en-IN')} disbursed to ${input.merchantName} via UPI.`,
        };
    },

    getEmiSchedule(loanId: string): Array<{ emiNumber: number; dueDate: string; amount: number; status: string }> {
        const emi = calcEmi(50000, CDL_INTEREST_RATE, 12);
        return Array.from({ length: 12 }, (_, i) => ({
            emiNumber: i + 1,
            dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
            amount: emi,
            status: i === 0 ? 'PAID' : 'PENDING',
        }));
    },

    processManualPayment(loanId: string, emiId: string): { loanId: string; emiId: string; status: string; paidAt: string } {
        return { loanId, emiId, status: 'PAID', paidAt: new Date().toISOString() };
    },

    handlePaymentFailure(loanId: string, emiId: string): { loanId: string; emiId: string; status: string; retryDate: string } {
        return {
            loanId, emiId, status: 'FAILED',
            retryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        };
    },

    getOverdueStatus(loanId: string): CdlOverdueStatus {
        return {
            loanId,
            overdueAmount: 0,
            overdueDays: 0,
            penaltyCharges: 0,
            totalDue: 0,
            status: 'CURRENT',
            note: 'No overdue amount.',
        };
    },

    closeLoan(loanId: string): CdlClosureResult {
        return {
            loanId,
            closureId: `closure_cdl_${Date.now()}`,
            totalAmountPaid: 50000,
            closedAt: new Date().toISOString(),
            note: 'CDL closed successfully.',
        };
    },

    activateLoan(userId: string, input: Record<string, unknown>) {
        return { loanId: `cdl_loan_${Date.now()}`, status: 'ACTIVE', activatedAt: new Date().toISOString(), ...input };
    },
    generateNoc(loanId: string): { nocRef: string; nocS3Url: string } {
        return {
            nocRef: `NOC-CDL-${loanId}-${Date.now()}`,
            nocS3Url: `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/noc/cdl_${loanId}.pdf`,
        };
    },
};

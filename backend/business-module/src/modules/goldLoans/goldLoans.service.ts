// src/modules/goldLoans/goldLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { NotFoundError } from '@/errors';
import { loansRepository } from '@/modules/loans/loans.repository';
import type {
    GoldRate,
    GoldEligibilityRequest,
    GoldEligibility,
    GoldLoanBranch,
    GoldLoanAppointmentRequest,
    GoldLoanAppointment,
    GoldLoanAppraisalResult,
    GoldLoanAgreementResult,
    GoldLoanNachResult,
    GoldLoanDisbursalStatus,
    GoldLoanMonitoring,
    GoldLoanClosureQuote,
    GoldLoanComplianceResult,
} from './goldLoans.types';

const log = createModuleLogger('goldLoans.service');

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GOLD_RATE_PER_GRAM = 6200;
const MAX_LTV_PERCENT = 75;
const GOLD_INTEREST_RATE = 10.56; // Annual %
const GOLD_PROCESSING_FEE_PCT = 0.5; // 0.5% of loan amount

const PURITY_MAP: Record<string, number> = {
    '18': 0.750,
    '20': 0.833,
    '22': 0.916,
    '24': 0.999,
};

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const goldLoansService = {

    // GET /gold-loans/rate
    getGoldRate(): GoldRate {
        return {
            ratePerGram: GOLD_RATE_PER_GRAM,
            purityRates: {
                '18K': Math.round(GOLD_RATE_PER_GRAM * 0.750),
                '20K': Math.round(GOLD_RATE_PER_GRAM * 0.833),
                '22K': Math.round(GOLD_RATE_PER_GRAM * 0.916),
                '24K': Math.round(GOLD_RATE_PER_GRAM * 0.999),
            },
            maxLtvPercent: MAX_LTV_PERCENT,
            currency: 'INR',
            updatedAt: new Date().toISOString(),
            source: 'IBJA',
            note: 'Rate is indicative. Final value subject to physical assessment at branch.',
        };
    },

    // POST /gold-loans/eligibility
    calculateEligibility(req: GoldEligibilityRequest): GoldEligibility {
        const purity = PURITY_MAP[req.purityKarat] ?? 0.916;
        const estimatedGoldValue = Math.round(GOLD_RATE_PER_GRAM * purity * req.weightGrams);
        const maxLoanAmount = Math.round(estimatedGoldValue * (MAX_LTV_PERCENT / 100));
        const requestedAmount = req.requestedAmount ?? maxLoanAmount;
        const approvedAmount = Math.min(requestedAmount, maxLoanAmount);
        const tenureMonths = req.tenureMonths ?? 12;
        const repaymentMode = req.repaymentMode ?? 'EMI';
        const processingFee = Math.round(approvedAmount * (GOLD_PROCESSING_FEE_PCT / 100));
        const monthlyRate = GOLD_INTEREST_RATE / 12 / 100;

        let monthlyEmi: number | null = null;
        let monthlyInterest: number | null = null;

        if (repaymentMode === 'EMI') {
            const r = monthlyRate;
            const n = tenureMonths;
            monthlyEmi = Math.round(approvedAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
        } else if (repaymentMode === 'INTEREST_ONLY') {
            monthlyInterest = Math.round(approvedAmount * monthlyRate);
        }

        return {
            eligible: approvedAmount > 0,
            estimatedGoldValue,
            maxLoanAmount,
            requestedAmount,
            approvedAmount,
            interestRate: GOLD_INTEREST_RATE,
            tenureMonths,
            repaymentMode,
            monthlyEmi,
            monthlyInterest,
            processingFee,
            ltv: Math.round((approvedAmount / estimatedGoldValue) * 100),
            currency: 'INR',
            note: 'Final loan amount subject to physical gold assessment at branch.',
        };
    },

    // GET /gold-loans/branches/nearby
    getNearbyBranches(): GoldLoanBranch[] {
        // Stub â€” replace with real DB query when branches table is added
        return [
            {
                id: 'branch_001',
                name: 'Feuhrer NBFC â€” Goregaon',
                address: 'Plot 22, MTNL Road, Goregaon West',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400062',
                phone: '022-12345678',
                lat: 19.1663,
                lng: 72.8526,
                distanceKm: 1.2,
                availableSlots: ['9:30 AM - 11:30 AM', '11:30 AM - 1:30 PM', '2:00 PM - 4:00 PM'],
                workingHours: 'Mon-Sat 9:00 AM - 5:00 PM',
            },
            {
                id: 'branch_002',
                name: 'Feuhrer NBFC â€” Andheri',
                address: '14, SV Road, Andheri West',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400058',
                phone: '022-87654321',
                lat: 19.1136,
                lng: 72.8697,
                distanceKm: 3.5,
                availableSlots: ['9:30 AM - 11:30 AM', '2:00 PM - 4:00 PM'],
                workingHours: 'Mon-Sat 9:00 AM - 5:00 PM',
            },
        ];
    },

    // POST /gold-loans/appointments
    bookAppointment(req: GoldLoanAppointmentRequest): GoldLoanAppointment {
        const refId = `FHR-GL-${Math.floor(100000 + Math.random() * 900000)}`;
        const branch = this.getNearbyBranches().find(b => b.id === req.branchId) ?? this.getNearbyBranches()[0]!;

        return {
            appointmentId: `apt_${Date.now()}`,
            applicationId: req.applicationId,
            branchId: branch.id,
            branchName: branch.name,
            branchAddress: `${branch.address}, ${branch.city} ${branch.pincode}`,
            confirmedDate: req.preferredDate,
            confirmedSlot: req.preferredSlot,
            referenceId: refId,
            status: 'CONFIRMED',
            note: 'Please bring original gold and a valid photo ID. SMS confirmation sent.',
        };
    },

    // GET /gold-loans/applications/:id/appraisal
    async getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult> {
        log.debug('Getting appraisal result', { applicationId });
        // Stub â€” replace with DB query when appraisal table added
        return {
            applicationId,
            appraisedGoldValue: 180000,
            actualWeightGrams: 30,
            actualPurityKarat: '22K',
            finalLoanAmount: 135000,
            ltv: 75,
            appraisedBy: 'Branch Staff',
            appraisedAt: new Date().toISOString(),
            status: 'COMPLETED',
            note: 'Gold assessed at branch. Final loan amount approved.',
        };
    },

    // POST /gold-loans/applications/:id/accept-final-amount
    async acceptFinalAmount(applicationId: string, amount: number): Promise<{ success: boolean; message: string }> {
        log.info('Customer accepted final loan amount', { applicationId, amount });
        return {
            success: true,
            message: `Loan amount of â‚¹${amount.toLocaleString('en-IN')} accepted. Proceeding to agreement.`,
        };
    },

    // POST /gold-loans/applications/:id/agreement
    async generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult> {
        log.info('Generating gold loan agreement', { applicationId });
        return {
            applicationId,
            agreementId: `agr_gl_${Date.now()}`,
            agreementUrl: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/${applicationId}.pdf`,
            status: 'GENERATED',
            eSignRequestId: null,
            stampDutyAmount: 100,
            note: 'Agreement generated. Please review and sign using OTP.',
        };
    },

    // POST /gold-loans/applications/:id/esign
    async completeESign(applicationId: string, otp: string): Promise<GoldLoanAgreementResult> {
        log.info('Completing eSign for gold loan', { applicationId });
        return {
            applicationId,
            agreementId: `agr_gl_${applicationId}`,
            agreementUrl: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/${applicationId}_signed.pdf`,
            status: 'SIGNED',
            eSignRequestId: `esign_${Date.now()}`,
            stampDutyAmount: 100,
            note: 'Agreement signed & stored. Proceeding to NACH setup.',
        };
    },

    // POST /gold-loans/applications/:id/nach
    async initiateNach(applicationId: string): Promise<GoldLoanNachResult> {
        log.info('Initiating NACH for gold loan', { applicationId });
        return {
            applicationId,
            mandateId: `mandate_gl_${Date.now()}`,
            mandateType: 'E_NACH',
            bankAccount: 'XXXX1234',
            maxAmount: 50000,
            frequency: 'MONTHLY',
            status: 'PENDING_REGISTRATION',
            razorpayMandateId: null,
            note: 'NACH mandate registration initiated via Razorpay.',
        };
    },

    // GET /gold-loans/applications/:id/disbursal
    async getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus> {
        log.debug('Getting disbursal status', { applicationId });
        return {
            applicationId,
            disbursalId: `disb_gl_${Date.now()}`,
            amount: 135000,
            mode: 'IMPS',
            status: 'COMPLETED',
            utrNumber: `UTR${Date.now()}`,
            disbursedAt: new Date().toISOString(),
            bankAccount: 'XXXX1234',
            note: 'Loan disbursed to your registered bank account.',
        };
    },

    // GET /gold-loans/:id/monitoring
    async getMonitoring(loanId: string): Promise<GoldLoanMonitoring> {
        log.debug('Getting gold loan monitoring', { loanId });
        return {
            loanId,
            currentGoldValue: 185000,
            currentLtv: 73,
            maxLtv: 75,
            ltvBreached: false,
            outstandingAmount: 130000,
            overdueAmount: 0,
            nextEmiDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            nextEmiAmount: 12500,
            goldStorageStatus: 'SAFE_IN_VAULT',
            auctionRisk: 'LOW',
            note: 'Gold is safe. LTV within limit.',
        };
    },

    // GET /gold-loans/:id/closure-quote
    async getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote> {
        log.debug('Getting closure quote', { loanId });
        return {
            loanId,
            principalOutstanding: 120000,
            interestOutstanding: 3200,
            penaltyCharges: 0,
            processingFee: 0,
            totalClosureAmount: 123200,
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            goldReleaseNote: 'Gold will be released at branch within 2 working hours of payment confirmation.',
        };
    },

    // POST /gold-loans/applications/:id/compliance
    async runCompliance(applicationId: string): Promise<GoldLoanComplianceResult> {
        log.info('Running compliance for gold loan', { applicationId });
        return {
            applicationId,
            kycStatus: 'PASSED',
            amlStatus: 'PASSED',
            pepStatus: 'PASSED',
            overallStatus: 'PASSED',
            flags: [],
            note: 'All compliance checks passed.',
        };
    },
};

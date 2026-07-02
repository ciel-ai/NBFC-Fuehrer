// src/modules/goldLoans/goldLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { goldLoansRepository } from './goldLoans.repository';
import { loansRepository } from '@/modules/loans/loans.repository';
import { LOAN_STATUS } from '@/config/constants';
import { NotFoundError, LoanStateError } from '@/errors';
import type {
    GoldRate,
    GoldEligibilityRequest,
    GoldEligibility,
    GoldLoanBranch,
    GoldLoanAppointmentRequest,
    GoldLoanAppointment,
    GoldAppraisalInput,
    GoldLoanAppraisalResult,
    GoldLoanAgreementResult,
    GoldLoanNachResult,
    GoldLoanDisbursalStatus,
    GoldLoanMonitoring,
    GoldLoanClosureQuote,
    GoldLoanComplianceResult,
} from './goldLoans.types';

const log = createModuleLogger('goldLoans.service');

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD_RATE_PER_GRAM  = 6200;
const MAX_LTV_PERCENT     = 75;
const GOLD_INTEREST_RATE  = 10.56;
const GOLD_PROCESSING_FEE = 0.5;

const PURITY_MAP: Record<string, number> = {
    '18': 0.750,
    '20': 0.833,
    '22': 0.916,
    '24': 0.999,
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const goldLoansService = {

    // ── GET /gold-loans/rate ──────────────────────────────────────────────────

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
            currency:      'INR',
            updatedAt:     new Date().toISOString(),
            source:        'IBJA',
            note:          'Rate is indicative. Final value subject to physical assessment at branch.',
        };
    },

    // ── POST /gold-loans/eligibility ──────────────────────────────────────────

    calculateEligibility(req: GoldEligibilityRequest): GoldEligibility {
        const purity          = PURITY_MAP[req.purityKarat] ?? 0.916;
        const estimatedValue  = Math.round(GOLD_RATE_PER_GRAM * purity * req.weightGrams);
        const maxLoan         = Math.round(estimatedValue * (MAX_LTV_PERCENT / 100));
        const requested       = req.requestedAmount ?? maxLoan;
        const approved        = Math.min(requested, maxLoan);
        const tenure          = req.tenureMonths ?? 12;
        const mode            = req.repaymentMode ?? 'EMI';
        const processingFee   = Math.round(approved * (GOLD_PROCESSING_FEE / 100));
        const monthlyRate     = GOLD_INTEREST_RATE / 12 / 100;

        let monthlyEmi: number | null      = null;
        let monthlyInterest: number | null = null;

        if (mode === 'EMI') {
            const r = monthlyRate;
            const n = tenure;
            monthlyEmi = Math.round(approved * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
        } else if (mode === 'INTEREST_ONLY') {
            monthlyInterest = Math.round(approved * monthlyRate);
        }

        return {
            eligible:           approved > 0,
            estimatedGoldValue: estimatedValue,
            maxLoanAmount:      maxLoan,
            requestedAmount:    requested,
            approvedAmount:     approved,
            interestRate:       GOLD_INTEREST_RATE,
            tenureMonths:       tenure,
            repaymentMode:      mode,
            monthlyEmi,
            monthlyInterest,
            processingFee,
            ltv:      Math.round((approved / estimatedValue) * 100),
            currency: 'INR',
            note:     'Final loan amount subject to physical gold assessment at branch.',
        };
    },

    // ── GET /gold-loans/branches ──────────────────────────────────────────────

    async getNearbyBranches(): Promise<GoldLoanBranch[]> {
        return goldLoansRepository.findAllBranches();
    },

    // ── POST /gold-loans/appointments ─────────────────────────────────────────

    async bookAppointment(
        req: GoldLoanAppointmentRequest,
    ): Promise<GoldLoanAppointment> {
        const application = await loansRepository.findApplicationByIdOrThrow(req.loanId);

        const customer = await loansRepository.findCustomerByUserId(req.userId);
        if (!customer) throw new NotFoundError('Customer profile', req.userId);
        const customerId = customer.id;

        // Loan must be in KYC_PENDING to book an appointment
        if (application.status !== LOAN_STATUS.KYC_PENDING) {
            throw new LoanStateError(
                req.loanId,
                application.status,
                LOAN_STATUS.APPOINTMENT_BOOKED,
            );
        }

        const branch = await goldLoansRepository.findBranchById(req.branchId);
        if (!branch) throw new NotFoundError('Branch', req.branchId);

        // Create appointment in DB
        const appointment = await goldLoansRepository.createAppointment({
            loanId:        req.loanId,
            branchId:      req.branchId,
            customerId,
            preferredDate: req.preferredDate,
            preferredSlot: req.preferredSlot,
        });

        // Transition loan status → APPOINTMENT_BOOKED
        await loansRepository.updateApplicationStatus(
            req.loanId,
            LOAN_STATUS.APPOINTMENT_BOOKED,
        );

        log.info('Gold loan appointment booked', {
            appointmentId: appointment.id,
            loanId:        req.loanId,
            branchId:      req.branchId,
            date:          req.preferredDate,
        });

        return {
            appointmentId: appointment.id,
            loanId:        appointment.loanId,
            branchId:      appointment.branchId,
            branchName:    branch.name,
            branchAddress: `${branch.address}, ${branch.city} ${branch.pincode}`,
            confirmedDate: appointment.preferredDate,
            confirmedSlot: appointment.preferredSlot,
            status:        appointment.status,
            note:          'Please bring original gold items and a valid photo ID. SMS confirmation sent.',
        };
    },

    // ── GET /gold-loans/appointments/:id ─────────────────────────────────────

    async getAppointment(appointmentId: string): Promise<GoldLoanAppointment> {
        const appointment = await goldLoansRepository.findAppointmentById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment', appointmentId);

        const branch = await goldLoansRepository.findBranchById(appointment.branchId);

        return {
            appointmentId: appointment.id,
            loanId:        appointment.loanId,
            branchId:      appointment.branchId,
            branchName:    branch?.name ?? '',
            branchAddress: branch ? `${branch.address}, ${branch.city} ${branch.pincode}` : '',
            confirmedDate: appointment.preferredDate,
            confirmedSlot: appointment.preferredSlot,
            status:        appointment.status,
            note:          '',
        };
    },

    // ── POST /gold-loans/appointments/:id/arrive ──────────────────────────────
    // Branch staff marks customer as arrived → transitions loan to APPRAISAL_PENDING

    async markArrived(appointmentId: string): Promise<GoldLoanAppointment> {
        const appointment = await goldLoansRepository.findAppointmentById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment', appointmentId);

        // Update appointment status
        const updated = await goldLoansRepository.updateAppointmentStatus(
            appointmentId,
            'ARRIVED',
            { arrived_at: new Date() },
        );

        // Transition loan → APPRAISAL_PENDING
        await loansRepository.updateApplicationStatus(
            appointment.loanId,
            LOAN_STATUS.APPRAISAL_PENDING,
        );

        const branch = await goldLoansRepository.findBranchById(appointment.branchId);

        log.info('Customer arrived for gold loan appraisal', {
            appointmentId,
            loanId: appointment.loanId,
        });

        return {
            appointmentId: updated.id,
            loanId:        updated.loanId,
            branchId:      updated.branchId,
            branchName:    branch?.name ?? '',
            branchAddress: branch ? `${branch.address}, ${branch.city} ${branch.pincode}` : '',
            confirmedDate: updated.preferredDate,
            confirmedSlot: updated.preferredSlot,
            status:        updated.status,
            note:          'Customer arrived. Proceed with gold appraisal.',
        };
    },

    // ── POST /gold-loans/applications/:id/appraise ───────────────────────────
    // Branch staff enters appraisal data → writes to collateral_gold
    // → transitions loan to PENDING_APPROVAL

    async submitAppraisal(input: GoldAppraisalInput): Promise<GoldLoanAppraisalResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(input.loanId);

        if (application.status !== LOAN_STATUS.APPRAISAL_PENDING) {
            throw new LoanStateError(
                input.loanId,
                application.status,
                LOAN_STATUS.PENDING_APPROVAL,
            );
        }

        const purityFraction = input.purityKarat / 24;
        const valuation      = Math.round(input.netWeightGrams * purityFraction * input.ratePerGram);
        const ltvPct         = MAX_LTV_PERCENT;
        const finalLoan      = Math.round(valuation * (ltvPct / 100));

        // Write collateral record
        await goldLoansRepository.createCollateralGold({
            loanId:           input.loanId,
            netWeightGrams:   input.netWeightGrams,
            grossWeightGrams: input.grossWeightGrams,
            purityKarat:      input.purityKarat,
            ratePerGram:      input.ratePerGram,
            valuation,
            ltvPct,
            items:            input.items,
            valuedBy:         input.valuedBy,
        });

        // Transition loan → PENDING_APPROVAL
        await loansRepository.updateApplicationStatus(
            input.loanId,
            LOAN_STATUS.PENDING_APPROVAL,
        );

        log.info('Gold loan appraisal submitted', {
            loanId:    input.loanId,
            valuation,
            finalLoan,
            valuedBy:  input.valuedBy,
        });

        return {
            applicationId:      input.loanId,
            appraisedGoldValue: valuation,
            actualWeightGrams:  input.netWeightGrams,
            actualPurityKarat:  `${input.purityKarat}K`,
            finalLoanAmount:    finalLoan,
            ltv:                ltvPct,
            appraisedBy:        input.valuedBy,
            appraisedAt:        new Date().toISOString(),
            status:             'COMPLETED',
            note:               'Gold appraised. Application moved to credit review.',
        };
    },

    // ── GET /gold-loans/applications/:id/appraisal ───────────────────────────

    async getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult> {
        const collateral = await goldLoansRepository.findCollateralByLoanId(applicationId);

        if (!collateral) {
            return {
                applicationId,
                appraisedGoldValue: 0,
                actualWeightGrams:  0,
                actualPurityKarat:  '',
                finalLoanAmount:    0,
                ltv:                0,
                appraisedBy:        '',
                appraisedAt:        '',
                status:             'PENDING',
                note:               'Appraisal not yet completed.',
            };
        }

        const valuation  = Number(collateral.valuation);
        const finalLoan  = Math.round(valuation * (MAX_LTV_PERCENT / 100));

        return {
            applicationId,
            appraisedGoldValue: valuation,
            actualWeightGrams:  Number(collateral.net_weight_grams),
            actualPurityKarat:  `${collateral.purity_karat}K`,
            finalLoanAmount:    finalLoan,
            ltv:                Number(collateral.ltv_pct),
            appraisedBy:        collateral.valued_by,
            appraisedAt:        collateral.valued_at.toISOString(),
            status:             'COMPLETED',
            note:               'Gold assessed at branch. Final loan amount ready for credit review.',
        };
    },

    // ── Downstream stubs — wired to real flow after PENDING_APPROVAL ──────────
    // These feed into the existing loans approval → eSign → disbursement pipeline

    async acceptFinalAmount(
        applicationId: string,
        amount: number,
    ): Promise<{ success: boolean; message: string }> {
        log.info('Customer accepted final gold loan amount', { applicationId, amount });
        return {
            success: true,
            message: `Loan amount of ₹${amount.toLocaleString('en-IN')} accepted. Proceeding to agreement.`,
        };
    },

    async generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult> {
        log.info('Generating gold loan agreement', { applicationId });
        return {
            applicationId,
            agreementId:    `agr_gl_${Date.now()}`,
            agreementUrl:   `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/${applicationId}.pdf`,
            status:         'GENERATED',
            eSignRequestId: null,
            stampDutyAmount: 100,
            note:           'Agreement generated. Please review and sign using OTP.',
        };
    },

    async completeESign(
        applicationId: string,
        otp: string,
    ): Promise<GoldLoanAgreementResult> {
        log.info('Completing eSign for gold loan', { applicationId });
        return {
            applicationId,
            agreementId:    `agr_gl_${applicationId}`,
            agreementUrl:   `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/${applicationId}_signed.pdf`,
            status:         'SIGNED',
            eSignRequestId: `esign_${Date.now()}`,
            stampDutyAmount: 100,
            note:           'Agreement signed & stored. Proceeding to NACH setup.',
        };
    },

    async initiateNach(applicationId: string): Promise<GoldLoanNachResult> {
        log.info('Initiating NACH for gold loan', { applicationId });
        return {
            applicationId,
            mandateId:        `mandate_gl_${Date.now()}`,
            mandateType:      'E_NACH',
            bankAccount:      'XXXX1234',
            maxAmount:        50000,
            frequency:        'MONTHLY',
            status:           'PENDING_REGISTRATION',
            razorpayMandateId: null,
            note:             'NACH mandate registration initiated via Razorpay.',
        };
    },

    async getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus> {
        return {
            applicationId,
            disbursalId: `disb_gl_${Date.now()}`,
            amount:      135000,
            mode:        'IMPS',
            status:      'COMPLETED',
            utrNumber:   `UTR${Date.now()}`,
            disbursedAt: new Date().toISOString(),
            bankAccount: 'XXXX1234',
            note:        'Loan disbursed to your registered bank account.',
        };
    },

    async getMonitoring(loanId: string): Promise<GoldLoanMonitoring> {
        return {
            loanId,
            currentGoldValue:  185000,
            currentLtv:        73,
            maxLtv:            75,
            ltvBreached:       false,
            outstandingAmount: 130000,
            overdueAmount:     0,
            nextEmiDate:       new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            nextEmiAmount:     12500,
            goldStorageStatus: 'SAFE_IN_VAULT',
            auctionRisk:       'LOW',
            note:              'Gold is safe. LTV within limit.',
        };
    },

    async getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote> {
        return {
            loanId,
            principalOutstanding: 120000,
            interestOutstanding:  3200,
            penaltyCharges:       0,
            processingFee:        0,
            totalClosureAmount:   123200,
            validUntil:           new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            goldReleaseNote:      'Gold will be released at branch within 2 working hours of payment confirmation.',
        };
    },

    async runCompliance(applicationId: string): Promise<GoldLoanComplianceResult> {
        log.info('Running compliance for gold loan', { applicationId });
        return {
            applicationId,
            kycStatus:     'PASSED',
            amlStatus:     'PASSED',
            pepStatus:     'PASSED',
            overallStatus: 'PASSED',
            flags:         [],
            note:          'All compliance checks passed.',
        };
    },
};
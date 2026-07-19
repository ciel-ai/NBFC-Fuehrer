// src/modules/goldLoans/goldLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { goldLoansRepository } from './goldLoans.repository';
import { loansRepository } from '@/modules/loans/loans.repository';
import { LOAN_STATUS } from '@/config/constants';
import { NotFoundError, LoanStateError, ValidationError } from '@/errors';
import { prisma } from '@/config/database';
import { emiService } from '@/modules/emi';
import { disbursementService } from '@/modules/disbursement';
import { assertTransition } from '@/utils/loanStateMachine.util';
import { pdfService } from '@/modules/documents/pdf.service';
import { getDocStorageProvider } from '@/providers/docStorage';
import { getEncryptionProvider } from '@/providers/encryption';
import { getESignProvider } from '@/providers/esign';
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

        // Save nomination details if provided
        if (req.nomineeName) {
            await prisma.loan_applications.update({
                where: { id: req.loanId },
                data: {
                    nominee_name:         req.nomineeName,
                    nominee_relationship: req.nomineeRelationship,
                    nominee_address:      req.nomineeAddress,
                    nominee_age:          req.nomineeAge,
                },
            });
        }

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

    // Real: validates the state transition (PENDING_APPROVAL → APPROVED)
    // and persists the accepted amount. Previously logged and returned
    // success without writing anything — approved_amount never got
    // recorded and the application never actually advanced state.
    async acceptFinalAmount(
        applicationId: string,
        amount: number,
    ): Promise<{ success: boolean; message: string }> {
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
        });

        assertTransition(applicationId, application.status, LOAN_STATUS.APPROVED);

        if (amount <= 0) {
            throw new ValidationError('amount', 'Accepted amount must be greater than zero');
        }

        await prisma.loan_applications.update({
            where: { id: applicationId },
            data: {
                approved_amount: amount,
                status: LOAN_STATUS.APPROVED,
                updated_at: new Date(),
            },
        });

        log.info('Customer accepted final gold loan amount', { applicationId, amount });

        return {
            success: true,
            message: `Loan amount of ₹${amount.toLocaleString('en-IN')} accepted. Proceeding to agreement.`,
        };
    },

    // Real: generates the actual agreement PDF, uploads it to S3, decrypts
    // the borrower's Aadhaar (necessary and legitimate here — eSign binding
    // requires the full number, not just last 4), and creates a real
    // signing request with the eSign provider. Previously returned a fake
    // S3 URL that pointed to a file which never existed.
    async generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult> {
        log.info('Generating gold loan agreement', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.user_id },
            select: { aadhaar_encrypted: true },
        });

        if (!kyc?.aadhaar_encrypted) {
            throw new LoanStateError(
                applicationId,
                application.status,
                LOAN_STATUS.ESIGN_PENDING,
            );
        }

        const pdfBuffer = await pdfService.generateGoldLoanAgreement(applicationId);

        const docStorage = getDocStorageProvider();
        const s3Key = `agreements/gold/${applicationId}.pdf`;
        await docStorage.upload({
            key: s3Key,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
        });
        const { url: agreementUrl } = await docStorage.getSignedUrl(s3Key);

        const encryption = getEncryptionProvider();
        const aadhaarPlain = await encryption.decrypt(kyc.aadhaar_encrypted);

        const esign = getESignProvider();
        const signRequest = await esign.createSignRequest({
            documentId: `loan-agreement-${applicationId}`,
            documentBase64: pdfBuffer.toString('base64'),
            signerName: application.user?.full_name ?? '',
            signerPhone: application.user?.phone ?? '',
            signerAadhaar: aadhaarPlain,
            purpose: 'Gold Loan Agreement Signature',
        });

        await prisma.kyc_documents.update({
            where: { user_id: application.user_id },
            data: {
                esign_request_id: signRequest.requestId,
                esign_status: signRequest.status,
                updated_at: new Date(),
            },
        });

        return {
            applicationId,
            agreementId: s3Key,
            agreementUrl: signRequest.signingUrl || agreementUrl,
            status: 'GENERATED',
            eSignRequestId: signRequest.requestId,
            stampDutyAmount: 100, // Placeholder — pending client confirmation of actual stamp duty rate
            note: 'Agreement generated. Please review and sign using Aadhaar OTP.',
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

    // Real: reads the actual disbursement record. Note the parameter here
    // is genuinely an applicationId (unlike getClosureQuote/getMonitoring
    // above, which take an account id) — disbursement records are keyed by
    // loan_id = loan_applications.id, since a disbursement can be initiated
    // before the loan_accounts row even exists.
    async getDisbursalStatus(applicationId: string): Promise<GoldLoanDisbursalStatus> {
        const record = await disbursementService.getDisbursementByLoan(applicationId);

        if (!record) {
            return {
                applicationId,
                disbursalId: '',
                amount:      0,
                mode:        'IMPS',
                status:      'PENDING',
                utrNumber:   null,
                disbursedAt: null,
                bankAccount: '',
                note:        'Disbursement has not been initiated yet.',
            };
        }

        const statusMap: Record<string, GoldLoanDisbursalStatus['status']> = {
            PENDING: 'PENDING',
            INITIATED: 'PROCESSING',
            IN_TRANSIT: 'PROCESSING',
            COMPLETED: 'COMPLETED',
            FAILED: 'FAILED',
            REVERSED: 'FAILED',
        };

        return {
            applicationId,
            disbursalId: record.id,
            amount:      record.netDisbursedAmount,
            mode:        record.mode,
            status:      statusMap[record.status] ?? 'PENDING',
            utrNumber:   record.utrNumber,
            disbursedAt: record.completedAt?.toISOString() ?? null,
            bankAccount: '', // Not stored on the disbursement record — bank details live on the customer/mandate, not surfaced here today.
            note: record.status === 'COMPLETED'
                ? 'Loan disbursed to your registered bank account.'
                : record.status === 'FAILED'
                    ? `Disbursement failed: ${record.failureReason ?? 'unknown reason'}`
                    : 'Disbursement is being processed.',
        };
    },

    // Real: outstanding balance, next EMI, overdue amount, and gold custody
    // status all come from the actual DB. currentGoldValue/currentLtv are
    // NOT live-tracked — no live gold rate feed exists anywhere in this
    // codebase (a genuinely separate, unbuilt feature). Rather than fake a
    // "current" value that could mislead on actual LTV risk, this uses the
    // valuation captured at loan origination, clearly labeled as such.
    async getMonitoring(loanId: string): Promise<GoldLoanMonitoring> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        const summary = await emiService.getSummary(loanId);

        const overdueAgg = await prisma.emi_schedule.aggregate({
            where: { loan_account_id: loanId, status: 'OVERDUE' },
            _sum: { emi_amount: true },
        });
        const overdueAmount = Number(overdueAgg._sum.emi_amount ?? 0);

        const collateral = await prisma.collateral_gold.findUnique({
            where: { loan_id: account.applicationId },
            select: { valuation: true, ltv_pct: true, custody_status: true },
        });

        const originGoldValue = collateral ? Number(collateral.valuation) : null;
        const originLtv = collateral ? Number(collateral.ltv_pct) : null;
        const maxLtv = 75; // per client requirement — gold loan max LTV

        const auctionRisk: GoldLoanMonitoring['auctionRisk'] =
            overdueAmount > 0 ? 'MEDIUM' : 'LOW';

        return {
            loanId,
            currentGoldValue:  originGoldValue ?? 0,
            currentLtv:        originLtv ?? 0,
            maxLtv,
            // Cannot be accurately determined without a live rate feed —
            // conservatively false rather than guessing.
            ltvBreached:       false,
            outstandingAmount: summary.totalOutstanding,
            overdueAmount,
            nextEmiDate:       summary.nextDueDate?.toISOString() ?? null,
            nextEmiAmount:     summary.nextEmiAmount,
            goldStorageStatus: collateral?.custody_status ?? 'UNKNOWN',
            auctionRisk,
            note: originGoldValue
                ? 'Gold value shown reflects valuation at loan origination — live market-rate tracking is not yet available.'
                : 'Gold valuation record not found for this loan.',
        };
    },

    // Real: reuses the same foreclosure calculation already fixed and
    // tested for CDL (emiService.getForeclosureQuote — see the earlier fix
    // where this used to silently charge 0% interest). `loanId` here is a
    // loan_accounts.id; gold collateral is looked up via the account's
    // application_id, since collateral_gold.loan_id actually references
    // loan_applications.id, not loan_accounts.id.
    async getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);

        const quote = await emiService.getForeclosureQuote(loanId, account.interestRate);

        const collateral = await prisma.collateral_gold.findUnique({
            where: { loan_id: account.applicationId },
            select: { custody_status: true, vault_location: true },
        });

        const goldReleaseNote = collateral?.custody_status === 'IN_CUSTODY'
            ? `Gold will be released from ${collateral.vault_location ?? 'the branch vault'} within 2 working hours of payment confirmation.`
            : 'Gold custody status unavailable — contact your branch for release details.';

        const validUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        return {
            loanId,
            principalOutstanding: quote.outstandingPrincipal,
            interestOutstanding:  quote.accruedInterest,
            penaltyCharges:       quote.penalty,
            processingFee:        quote.foreclosureFee,
            totalClosureAmount:   quote.total,
            validUntil:           validUntil.toISOString(),
            goldReleaseNote,
        };
    },

    // Real, with an honest limitation: AML checks genuinely run during KYC
    // (kyc.service.ts runRiskChecks) and a failure hard-rejects with a
    // stored reason — so amlStatus below is inferred from that outcome.
    // PEP status, however, is computed by the AML provider but never
    // persisted or acted on anywhere in the codebase today — reporting a
    // fake PASSED here would be a false compliance signal, so it's marked
    // NOT_TRACKED rather than guessed.
    async runCompliance(applicationId: string): Promise<GoldLoanComplianceResult> {
        log.info('Running compliance for gold loan', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            select: { user_id: true },
        });

        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.user_id },
            select: {
                overall_status: true,
                rejection_reason: true,
                failed_checks: true,
            },
        });

        if (!kyc) {
            return {
                applicationId,
                kycStatus: 'NOT_STARTED',
                amlStatus: 'PENDING',
                pepStatus: 'NOT_TRACKED',
                overallStatus: 'REVIEW',
                flags: ['KYC_NOT_STARTED'],
                note: 'KYC has not been initiated for this applicant.',
            };
        }

        const wasAmlRejected =
            kyc.overall_status === 'REJECTED' &&
            (kyc.rejection_reason?.toUpperCase().includes('AML') ?? false);

        const amlStatus = wasAmlRejected
            ? 'FAILED'
            : kyc.overall_status === 'COMPLETE'
                ? 'PASSED' // Inferred: a failed AML check would have blocked KYC completion.
                : 'PENDING';

        const overallStatus: GoldLoanComplianceResult['overallStatus'] =
            wasAmlRejected || kyc.overall_status === 'REJECTED'
                ? 'FAILED'
                : kyc.overall_status === 'COMPLETE'
                    ? 'PASSED'
                    : 'REVIEW';

        return {
            applicationId,
            kycStatus: kyc.overall_status,
            amlStatus,
            pepStatus: 'NOT_TRACKED',
            overallStatus,
            flags: kyc.failed_checks,
            note: wasAmlRejected
                ? `AML check flagged this application: ${kyc.rejection_reason}`
                : 'PEP screening is not currently tracked by this system — AML status is inferred from overall KYC outcome.',
        };
    },
};
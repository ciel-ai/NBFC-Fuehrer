// src/modules/goldLoans/goldLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { goldLoansRepository } from './goldLoans.repository';
import { loansRepository } from '@/modules/loans/loans.repository';
import { LOAN_STATUS, BUSINESS_RULES } from '@/config/constants';
import { NotFoundError, LoanStateError, ValidationError } from '@/errors';
import { prisma } from '@/config/database';
import { emiService } from '@/modules/emi';
import { disbursementService } from '@/modules/disbursement';
import { assertTransition } from '@/utils/loanStateMachine.util';
import { pdfService } from '@/modules/documents/pdf.service';
import { getDocStorageProvider } from '@/providers/docStorage';
import { getEncryptionProvider } from '@/providers/encryption';
import { getESignProvider } from '@/providers/esign';
import { paymentsService } from '@/modules/payments';
import { assertOwnsResource, assertAccountOwnership } from '@/utils/ownership.util';
import type { Role } from '@/config/constants';
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

const GOLD_RATE_PER_GRAM = BUSINESS_RULES.GOLD_RATE_PER_GRAM;
const GOLD_MAV_PERCENT   = BUSINESS_RULES.GOLD_MAV_PERCENT;
const DEFAULT_MAX_LTV_PERCENT = 75; // fallback if loan_products.max_ltv_pct is null

const PURITY_MAP: Record<string, number> = BUSINESS_RULES.GOLD_PURITY_MULTIPLIERS;

// Sourced from loan_products (product_type = 'GOLD_LOAN') instead of a
// hardcoded constant — rate/LTV/fee are now product-config-driven.
async function getGoldLoanProductConfig() {
    const product = await prisma.loan_products.findUniqueOrThrow({
        where: { product_type: 'GOLD_LOAN' },
    });
    return {
        interestRate:     parseFloat(product.min_rate.toString()),
        maxLtvPercent:    product.max_ltv_pct ? Number(product.max_ltv_pct) : DEFAULT_MAX_LTV_PERCENT,
        processingFeePct: Number(product.processing_fee_pct),
    };
}
// ─── Service ──────────────────────────────────────────────────────────────────

export const goldLoansService = {

    // ── GET /gold-loans/rate ──────────────────────────────────────────────────

    async getGoldRate(): Promise<GoldRate> {
    const { maxLtvPercent } = await getGoldLoanProductConfig();
    return {
        ratePerGram: GOLD_RATE_PER_GRAM,
        purityRates: {
            '16K': Math.round(GOLD_RATE_PER_GRAM * PURITY_MAP['16']!),
            '18K': Math.round(GOLD_RATE_PER_GRAM * PURITY_MAP['18']!),
            '20K': Math.round(GOLD_RATE_PER_GRAM * PURITY_MAP['20']!),
            '22K': Math.round(GOLD_RATE_PER_GRAM * PURITY_MAP['22']!),
            '24K': Math.round(GOLD_RATE_PER_GRAM * PURITY_MAP['24']!),
        },
        maxLtvPercent,
        currency:      'INR',
        updatedAt:     new Date().toISOString(),
        source:        'IBJA',
        note:          'Rate is indicative. Final value subject to physical assessment at branch.',
    };
},

    // ── POST /gold-loans/eligibility ──────────────────────────────────────────

    async calculateEligibility(req: GoldEligibilityRequest): Promise<GoldEligibility> {
    const purity = PURITY_MAP[req.purityKarat];
    if (purity === undefined) {
        throw new ValidationError('purityKarat', `Unsupported gold purity: ${req.purityKarat}K`);
    }

    const { interestRate, maxLtvPercent, processingFeePct } = await getGoldLoanProductConfig();

    const estimatedValue      = Math.round(GOLD_RATE_PER_GRAM * purity * req.weightGrams);
    // Margin per client's CAM formula before the LTV cap is applied.
    const eligiblePledgeValue = Math.round(estimatedValue * GOLD_MAV_PERCENT);
    const maxLoan             = Math.round(eligiblePledgeValue * (maxLtvPercent / 100));

    const requested       = req.requestedAmount ?? maxLoan;
    const approved        = Math.min(requested, maxLoan);
    const tenure           = req.tenureMonths ?? 12;
    const mode             = req.repaymentMode ?? 'EMI';
    const processingFee    = Math.round(approved * (processingFeePct / 100));
    const monthlyRate      = interestRate / 12 / 100;

    let monthlyEmi: number | null            = null;
    let monthlyInterest: number | null        = null;
    let quarterlyInterest: number | null      = null;
    let upfrontInterestAmount: number | null  = null;
    let netDisbursalAmount                    = approved;

    switch (mode) {
        case 'EMI': {
            const r = monthlyRate;
            const n = tenure;
            monthlyEmi = Math.round(approved * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
            break;
        }
        case 'MONTHLY_INTEREST':
            monthlyInterest = Math.round(approved * monthlyRate);
            break;
        case 'QUARTERLY_INTEREST':
            quarterlyInterest = Math.round(approved * monthlyRate * 3);
            break;
        case 'UPFRONT_MONTHLY_INTEREST':
            upfrontInterestAmount = Math.round(approved * monthlyRate);
            netDisbursalAmount    = approved - upfrontInterestAmount;
            break;
        case 'UPFRONT_QUARTERLY_INTEREST':
            upfrontInterestAmount = Math.round(approved * monthlyRate * 3);
            netDisbursalAmount    = approved - upfrontInterestAmount;
            break;
        case 'BULLET_REPAYMENT':
            // No periodic payment — full principal + accrued interest due at tenure end.
            break;
    }

    return {
        eligible:            approved > 0,
        estimatedGoldValue:  estimatedValue,
        eligiblePledgeValue,
        maxLoanAmount:       maxLoan,
        requestedAmount:     requested,
        approvedAmount:      approved,
        interestRate,
        tenureMonths:        tenure,
        repaymentMode:       mode,
        monthlyEmi,
        monthlyInterest,
        quarterlyInterest,
        upfrontInterestAmount,
        netDisbursalAmount,
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

    async getAppointment(appointmentId: string, callerId: string, callerRole: Role): Promise<GoldLoanAppointment> {
        const appointment = await goldLoansRepository.findAppointmentById(appointmentId);
        if (!appointment) throw new NotFoundError('Appointment', appointmentId);
        const customer = await loansRepository.findCustomerByUserId(callerId);
        assertOwnsResource(customer?.id ?? '', appointment.customerId, callerRole, 'appointment');

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

        // Per client's CAM formula:
        // Net Wt = (Gross Wt − Stone Wt) − (Gross Wt − Stone Wt) × Impurity%
        const netOfStone     = input.grossWeightGrams - input.stoneWeightGrams;
        const netWeightGrams = netOfStone - (netOfStone * input.impurityPct);

        const purityFraction = input.purityKarat / 24;
        const grossValuation = Math.round(netWeightGrams * purityFraction * input.ratePerGram);
        // Eligible Amount = (Rate × MAV%) × Net Weight
        const valuation       = Math.round(grossValuation * GOLD_MAV_PERCENT);
        const { maxLtvPercent } = await getGoldLoanProductConfig();
const ltvPct = maxLtvPercent;
        const finalLoan       = Math.round(valuation * (ltvPct / 100));

        await goldLoansRepository.createCollateralGold({
            loanId:           input.loanId,
            netWeightGrams,
            grossWeightGrams: input.grossWeightGrams,
            purityKarat:      input.purityKarat,
            ratePerGram:      input.ratePerGram,
            valuation,
            ltvPct,
            items:            input.items,
            valuedBy:         input.valuedBy,
        });

        await loansRepository.updateApplicationStatus(
            input.loanId,
            LOAN_STATUS.PENDING_APPROVAL,
        );

        log.info('Gold loan appraisal submitted', {
            loanId:    input.loanId,
            netWeightGrams,
            valuation,
            finalLoan,
            valuedBy:  input.valuedBy,
        });

        return {
            applicationId:      input.loanId,
            appraisedGoldValue: valuation,
            actualWeightGrams:  netWeightGrams,
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

    async getAppraisalResult(applicationId: string, callerId: string, callerRole: Role): Promise<GoldLoanAppraisalResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);
        assertOwnsResource(callerId, application.userId, callerRole, 'gold loan appraisal');
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
        const { maxLtvPercent } = await getGoldLoanProductConfig();
const finalLoan  = Math.round(valuation * (maxLtvPercent / 100));

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
        _otp: string,
    ): Promise<GoldLoanAgreementResult> {
        log.info('Checking eSign completion for gold loan', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
        });

        const kyc = await prisma.kyc_documents.findUniqueOrThrow({
            where: { user_id: application.user_id },
        });

        if (!kyc.esign_request_id) {
            throw new LoanStateError(applicationId, application.status, LOAN_STATUS.ESIGN_PENDING);
        }

        const esign = getESignProvider();
        const signStatus = await esign.getSignStatus(kyc.esign_request_id);

        if (signStatus.status !== 'SIGNED') {
            return {
                applicationId,
                agreementId: `agreements/gold/${applicationId}.pdf`,
                agreementUrl: '',
                status: 'PENDING',
                eSignRequestId: kyc.esign_request_id,
                stampDutyAmount: 100,
                note: `Signing not yet complete — current status: ${signStatus.status}.`,
            };
        }

        const customer = await prisma.customers.findUnique({
            where: { user_id: application.user_id },
            select: { state: true },
        });

        const stampResult = await esign.applyEStamp({
            requestId: kyc.esign_request_id,
            loanAmountRupees: Number(application.approved_amount ?? application.amount_requested),
            stateCode: customer?.state?.slice(0, 2).toUpperCase() ?? 'KA', // Placeholder mapping — pending a real state-name-to-code table
        });

        const signedDoc = await esign.getSignedDocument(kyc.esign_request_id);
        const docStorage = getDocStorageProvider();
        const signedS3Key = `agreements/gold/${applicationId}_signed.pdf`;
        await docStorage.upload({
            key: signedS3Key,
            fileBuffer: Buffer.from(signedDoc.documentBase64, 'base64'),
            contentType: 'application/pdf',
        });
        const { url: agreementUrl } = await docStorage.getSignedUrl(signedS3Key);

        await prisma.kyc_documents.update({
            where: { user_id: application.user_id },
            data: {
                esign_status: 'SIGNED',
                signed_agreement_s3_key: signedS3Key,
                // Previously stampResult was used only for the response's
                // stampDutyAmount and then discarded — nothing persisted
                // whether the eStamp actually succeeded, so no disbursement
                // gate could verify it.
                estamp_id: stampResult.stampId,
                estamp_status: stampResult.status,
                updated_at: new Date(),
            },
        });

        log.info('Gold loan agreement signed and stamped', { applicationId });

        return {
            applicationId,
            agreementId: signedS3Key,
            agreementUrl,
            status: 'SIGNED',
            eSignRequestId: kyc.esign_request_id,
            stampDutyAmount: stampResult.stampDutyRupees ?? 100,
            note: 'Agreement signed & stored. Proceeding to NACH setup.',
        };
    },

    async initiateNach(
        applicationId: string,
        input: { bankAccount: string; ifsc: string },
    ): Promise<GoldLoanNachResult> {
        log.info('Initiating NACH for gold loan', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        const principal = Number(application.approved_amount ?? application.amount_requested);
        // Max debit ceiling — same logic as CDL's post-activation mandate.
        const estimatedMonthlyEmi = principal / application.tenure_months;
        const maxAmount = Math.round(estimatedMonthlyEmi * 1.5);

        const mandate = await paymentsService.createMandateForApplication({
            applicationId,
            userId: application.user_id,
            customerName: application.user?.full_name ?? '',
            customerEmail: '',
            customerPhone: application.user?.phone ?? '',
            bankAccount: input.bankAccount,
            ifsc: input.ifsc,
            maxAmount,
        }, {} as any);

        return {
            applicationId,
            mandateId: mandate.id,
            mandateType: 'E_NACH',
            bankAccount: mandate.bankAccount,
            maxAmount,
            frequency: 'MONTHLY',
            status: 'PENDING_REGISTRATION',
            razorpayMandateId: mandate.razorpayMandateId,
            note: 'NACH mandate registration initiated via Razorpay.',
        };
    },

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

    async getMonitoring(loanId: string, callerId: string, callerRole: Role): Promise<GoldLoanMonitoring> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole, 'gold loan');
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

    async getClosureQuote(loanId: string, callerId: string, callerRole: Role): Promise<GoldLoanClosureQuote> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole, 'gold loan closure quote');

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
                ? 'PASSED'
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

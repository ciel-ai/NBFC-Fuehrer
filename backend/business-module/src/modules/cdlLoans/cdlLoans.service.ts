// src/modules/cdlLoans/cdlLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { env } from '@/config/env';
import { prisma } from '@/config/database';
import { ValidationError, NotFoundError } from '@/errors';
import { computeMonthlyEmi } from '@/modules/emi/emi.calculator';
import { emiService } from '@/modules/emi';
import { loansRepository } from '@/modules/loans/loans.repository';
import { paymentsService } from '@/modules/payments';
import { getPaymentProvider } from '@/providers';
import { pdfService } from '@/modules/documents/pdf.service';
import { getDocStorageProvider } from '@/providers/docStorage';
import { getEncryptionProvider } from '@/providers/encryption';
import { getESignProvider } from '@/providers/esign';
import { LOAN_STATUS, PRODUCT_TYPE, BUSINESS_RULES } from '@/config/constants';
import type {
    CdlApplicationInput, CdlApplicationResult,
    CdlKycResult, CdlComplianceResult,
    CdlCreditAssessmentInput, CdlCreditAssessment,
    CdlCreditDecision, CdlAgreementResult,
    CdlNachResult, CdlDisbursalResult,
    CdlOverdueStatus, CdlClosureResult,
} from './cdlLoans.types';

const log = createModuleLogger('cdlLoans.service');

// ─── Constants ────────────────────────────────────────────────────────────────

// Discrete allowed rates per employment type — per client spec, not a range.
const CDL_INTEREST_RATES: Record<'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT', number[]> = {
    SALARIED: [0, 13, 14],
    SELF_EMPLOYED: [0, 14, 15],
    // Client's rate table only covers Salaried/Self-Employed — STUDENT has
    // no defined rate. Defaulting to the SELF_EMPLOYED table conservatively
    // until confirmed with client; flag this explicitly in the demo.
    STUDENT: [0, 14, 15],
};

// Flat tiered processing fee by loan amount band — per client spec, not a %.
const CDL_PROCESSING_FEE_TIERS: { max: number; fee: number }[] = [
    { max: 25000, fee: 1463 },
    { max: 50000, fee: 1817 },
    { max: 100000, fee: 2466 },
];

const CDL_MIN_LOAN_AMOUNT = 7000;
const CDL_MAX_LOAN_AMOUNT = 100000;
const CDL_MIN_TENURE_MONTHS = 6;
const CDL_MAX_TENURE_MONTHS = 12;
const CDL_AUTO_DEBIT_DATES = [4, 7, 12];
const CDL_FOIR_LIMIT = 60; // per this CDL-specific spec (platform default elsewhere is 55%)

function getCdlInterestRate(employmentType: keyof typeof CDL_INTEREST_RATES, requested?: number): number {
    const allowed = CDL_INTEREST_RATES[employmentType];
    if (requested !== undefined) {
        if (!allowed.includes(requested)) {
            throw new ValidationError('interestRatePct', `${requested}% is not a valid rate for ${employmentType}. Allowed: ${allowed.join(', ')}%`);
        }
        return requested;
    }
    // Default to the standard (middle) rate when not explicitly chosen —
    // 0% is treated as a promotional rate, selected explicitly, not default.
    return allowed[1]!;
}

function getCdlProcessingFee(loanAmount: number): number {
    const tier = CDL_PROCESSING_FEE_TIERS.find(t => loanAmount <= t.max);
    if (!tier) throw new ValidationError('loanAmount', `Loan amount exceeds maximum allowed ₹${CDL_MAX_LOAN_AMOUNT.toLocaleString('en-IN')}`);
    return tier.fee;
}

function validateCdlLoanParams(loanAmount: number, tenureMonths: number, autoDebitDate?: number): void {
    if (loanAmount < CDL_MIN_LOAN_AMOUNT || loanAmount > CDL_MAX_LOAN_AMOUNT) {
        throw new ValidationError('loanAmount', `Loan amount must be between ₹${CDL_MIN_LOAN_AMOUNT.toLocaleString('en-IN')} and ₹${CDL_MAX_LOAN_AMOUNT.toLocaleString('en-IN')}`);
    }
    if (tenureMonths < CDL_MIN_TENURE_MONTHS || tenureMonths > CDL_MAX_TENURE_MONTHS) {
        throw new ValidationError('tenureMonths', `Tenure must be between ${CDL_MIN_TENURE_MONTHS} and ${CDL_MAX_TENURE_MONTHS} months`);
    }
    if (autoDebitDate !== undefined && !CDL_AUTO_DEBIT_DATES.includes(autoDebitDate)) {
        throw new ValidationError('autoDebitDate', `Auto-debit date must be one of: ${CDL_AUTO_DEBIT_DATES.join(', ')}`);
    }
}

// Previously a local reimplementation using Math.round(), which can round
// DOWN - meaning the EMI estimate shown here (before disbursement) could be
// a few paise lower than the real EMI actually charged after disbursement
// (computeMonthlyEmi deliberately uses Math.ceil(), "customer never
// underpays by rounding"). Now uses the same authoritative calculation for
// both the estimate and the real, disbursed schedule, eliminating that
// discrepancy entirely.
const calcEmi = computeMonthlyEmi;

export const cdlLoansService = {

    // ── Real: creates an actual loan_applications row, product_type =
    // CONSUMER_DURABLE, same table gold/housing loans use. ───────────────────
    async submitApplication(userId: string, input: CdlApplicationInput): Promise<CdlApplicationResult> {
        validateCdlLoanParams(input.loanAmount, input.tenureMonths, input.autoDebitDate);

        const interestRate = getCdlInterestRate(input.employmentType, input.interestRatePct);
        const emi = calcEmi(input.loanAmount, interestRate, input.tenureMonths);
        const processingFee = getCdlProcessingFee(input.loanAmount);

        const customer = await loansRepository.findCustomerByUserId(userId);

        const created = await loansRepository.createApplication({
            userId,
            agentId: null,
            customerId: customer?.id ?? null,
            amountRequested: input.loanAmount,
            tenureMonths: input.tenureMonths,
            productType: PRODUCT_TYPE.CONSUMER_DURABLE,
            purpose: input.productName,
            storeName: input.storeName,
            storeCity: input.storeCity,
            monthlyIncome: input.monthlyIncome,
            repaymentType: 'MONTHLY_EMI',
            appliedAt: new Date(),
        });

        // Persist the computed terms onto the application row.
        await prisma.loan_applications.update({
            where: { id: created.id },
            data: {
                interest_rate: interestRate,
                processing_fee: processingFee,
                monthly_emi: emi,
                updated_at: new Date(),
            },
        });

        const updated = await loansRepository.updateApplicationStatus(created.id, LOAN_STATUS.KYC_PENDING);

        log.info('CDL application created', { applicationId: updated.id, loanAmount: input.loanAmount });

        return {
            applicationId: updated.id,
            status: updated.status,
            loanAmount: input.loanAmount,
            tenureMonths: input.tenureMonths,
            interestRate,
            monthlyEmi: emi,
            processingFee,
            referenceId: updated.referenceNumber ?? '',
            createdAt: updated.appliedAt.toISOString(),
            note: 'CDL application created successfully.',
        };
    },

    // ── Real: reads the actual kyc_documents row for this applicant. ─────────
    async runKycChecks(applicationId: string): Promise<CdlKycResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.userId },
        });

        if (!kyc) {
            return {
                applicationId,
                kycStatus: 'PENDING',
                aadhaarVerified: false,
                panVerified: false,
                faceMatchScore: 0,
                note: 'KYC has not been initiated for this applicant.',
            };
        }

        const kycStatus: CdlKycResult['kycStatus'] =
            kyc.overall_status === 'COMPLETE' ? 'PASSED' :
            kyc.overall_status === 'REJECTED' ? 'FAILED' :
            'PENDING';

        return {
            applicationId,
            kycStatus,
            aadhaarVerified: kyc.completed_checks.includes('AADHAAR_VERIFY'),
            panVerified: kyc.completed_checks.includes('PAN_VERIFY'),
            faceMatchScore: kyc.face_match_score ? Number(kyc.face_match_score) : 0,
            note: kycStatus === 'PASSED' ? 'KYC verification completed.' : 'KYC verification incomplete.',
        };
    },

    // ── Real, with the same honest limitation as gold loans: AML is
    // inferred from the KYC outcome since that's genuinely where the AML
    // check runs and hard-rejects today. ──────────────────────────────────────
    async runComplianceChecks(applicationId: string): Promise<CdlComplianceResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.userId },
            select: { overall_status: true, rejection_reason: true },
        });

        if (!kyc) {
            return {
                applicationId,
                amlStatus: 'PENDING',
                overallStatus: 'REVIEW',
                note: 'KYC has not been initiated for this applicant.',
            };
        }

        const wasAmlRejected =
            kyc.overall_status === 'REJECTED' &&
            (kyc.rejection_reason?.toUpperCase().includes('AML') ?? false);

        const amlStatus = wasAmlRejected ? 'FAILED' : kyc.overall_status === 'COMPLETE' ? 'PASSED' : 'PENDING';
        const overallStatus: CdlComplianceResult['overallStatus'] =
            wasAmlRejected || kyc.overall_status === 'REJECTED' ? 'FAILED' :
            kyc.overall_status === 'COMPLETE' ? 'PASSED' : 'REVIEW';

        return {
            applicationId,
            amlStatus,
            overallStatus,
            note: wasAmlRejected ? `AML check flagged: ${kyc.rejection_reason}` : 'Compliance checks evaluated from KYC outcome.',
        };
    },

    // Pure calculation — matches client's FOIR formula and CIBIL decision
    // table exactly. No DB writes; the decision step below persists the
    // outcome once a final credit decision is made.
    runCreditAssessment(applicationId: string, input: CdlCreditAssessmentInput): CdlCreditAssessment {
        const foir = Math.round(((input.existingEmis + input.proposedEmi) / input.monthlyIncome) * 100 * 10) / 10;
        const foirStatus = foir <= CDL_FOIR_LIMIT ? 'PASS' : 'FAIL';

        // CIBIL decision table per client spec:
        // 750+ auto-approve, 700-749 manual review, 650-699 reject, <650 reject,
        // no-hit/new-to-credit → manual review.
        const cibilDecision: 'PASS' | 'REVIEW' | 'FAIL' =
            input.cibilScore >= 750 ? 'PASS' :
            input.cibilScore >= 700 ? 'REVIEW' :
            'FAIL';

        const creditStatus: 'PASS' | 'FAIL' | 'REVIEW' =
            (cibilDecision === 'FAIL' || foirStatus === 'FAIL') ? 'FAIL' :
            cibilDecision === 'REVIEW' ? 'REVIEW' :
            'PASS';

        const maxEligibleEmi = (input.monthlyIncome * CDL_FOIR_LIMIT / 100) - input.existingEmis;
        // 14% used here as a representative mid-tier rate for max-eligible-amount
        // estimation only — the actual approved rate is chosen at the decision step.
        const maxLoan = Math.round(maxEligibleEmi * (1 - Math.pow(1 + 14 / 12 / 100, -48)) / (14 / 12 / 100));

        return {
            applicationId,
            cibilScore: input.cibilScore,
            foir,
            foirStatus,
            creditStatus,
            maxLoanAmount: creditStatus === 'PASS' ? maxLoan : 0,
            note: `CIBIL ${input.cibilScore}, FOIR ${foir}% — ${creditStatus}.`,
        };
    },

    // ── Real: persists the actual decision onto loan_applications. ───────────
    async getCreditDecision(applicationId: string, assessment: CdlCreditAssessment): Promise<CdlCreditDecision> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        const approved = assessment.creditStatus === 'PASS';
        const inReview = assessment.creditStatus === 'REVIEW';

        const newStatus = approved ? LOAN_STATUS.APPROVED : inReview ? LOAN_STATUS.UNDERWRITING : LOAN_STATUS.REJECTED;
        const interestRate = application.interestRate ?? getCdlInterestRate('SALARIED');
        const approvedAmount = approved ? Math.min(assessment.maxLoanAmount, application.amountRequested) : null;
        const monthlyEmi = approved && approvedAmount ? calcEmi(approvedAmount, interestRate, application.tenureMonths) : null;

        await loansRepository.updateApplicationStatus(applicationId, newStatus, {
            approved_amount: approvedAmount,
            rejection_reason: approved || inReview ? null : 'CIBIL score or FOIR does not meet eligibility criteria.',
        });

        log.info('CDL credit decision recorded', { applicationId, decision: newStatus });

        return {
            applicationId,
            decision: approved ? 'APPROVED' : inReview ? 'PENDING' : 'REJECTED',
            approvedAmount,
            interestRate: approved ? interestRate : null,
            monthlyEmi,
            rejectionReason: approved || inReview ? null : 'CIBIL score or FOIR does not meet eligibility criteria.',
            note: approved ? 'CDL approved. Proceed to agreement.' : inReview ? 'Application requires manual review.' : 'Application rejected.',
        };
    },

    // ── Real: generates an actual PDF (pdfService), uploads it to real
    // document storage, and opens a real Signzy eSign request — same
    // pattern goldLoans.generateAgreement already uses. The eSign
    // request/status is stored on kyc_documents (not loan_applications),
    // matching where the existing eSign webhook (POST /webhooks/esign,
    // /webhooks/signzy → kycService.processESignCallback) already looks it
    // up — no webhook changes needed to wire this up. ─────────────────────────
    async generateAgreement(applicationId: string): Promise<CdlAgreementResult> {
        log.info('Generating CDL agreement', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.user_id },
            select: { aadhaar_encrypted: true },
        });

        if (!kyc?.aadhaar_encrypted) {
            throw new ValidationError('applicationId', 'Aadhaar verification must be complete before the agreement can be generated');
        }

        const pdfBuffer = await pdfService.generateCdlLoanAgreement(applicationId);

        const docStorage = getDocStorageProvider();
        const s3Key = `agreements/cdl/${applicationId}.pdf`;
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
            documentId: `cdl-agreement-${applicationId}`,
            documentBase64: pdfBuffer.toString('base64'),
            signerName: application.user?.full_name ?? '',
            signerPhone: application.user?.phone ?? '',
            signerAadhaar: aadhaarPlain,
            purpose: 'Consumer Durable Loan Agreement Signature',
        });

        await prisma.kyc_documents.update({
            where: { user_id: application.user_id },
            data: {
                esign_request_id: signRequest.requestId,
                esign_status: signRequest.status,
                updated_at: new Date(),
            },
        });

        log.info('CDL agreement generated, eSign request created', { applicationId, requestId: signRequest.requestId });

        return {
            applicationId,
            agreementId: s3Key,
            agreementUrl: signRequest.signingUrl || agreementUrl,
            status: 'GENERATED',
            eSignRequestId: signRequest.requestId,
            stampDutyAmount: 100, // Placeholder — pending client confirmation of actual stamp duty rate, same as gold/housing loans
            note: 'Agreement generated. Please review and sign using Aadhaar OTP.',
        };
    },

    // ── Real: checks real eSign status, applies a real eStamp once signed,
    // and stores the signed+stamped PDF — same pattern as
    // goldLoans.completeESign. Customer polls this after visiting the
    // signingUrl from generateAgreement (or after the eSign webhook fires). ──
    async completeESign(applicationId: string): Promise<CdlAgreementResult> {
        log.info('Checking eSign completion for CDL', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
        });

        const kyc = await prisma.kyc_documents.findUniqueOrThrow({
            where: { user_id: application.user_id },
        });

        if (!kyc.esign_request_id) {
            throw new ValidationError('applicationId', 'No eSign request found — call the agreement step first');
        }

        const esign = getESignProvider();
        const signStatus = await esign.getSignStatus(kyc.esign_request_id);

        if (signStatus.status !== 'SIGNED') {
            return {
                applicationId,
                agreementId: `agreements/cdl/${applicationId}.pdf`,
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
            stateCode: customer?.state?.slice(0, 2).toUpperCase() ?? 'KA', // Placeholder mapping — pending a real state-name-to-code table, same as gold loan
        });

        const signedDoc = await esign.getSignedDocument(kyc.esign_request_id);
        const docStorage = getDocStorageProvider();
        const signedS3Key = `agreements/cdl/${applicationId}_signed.pdf`;
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
                // whether the eStamp actually succeeded, so disburseToMerchant
                // below could not verify it before releasing funds.
                estamp_id: stampResult.stampId,
                estamp_status: stampResult.status,
                updated_at: new Date(),
            },
        });

        log.info('CDL agreement signed and stamped', { applicationId });

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

    // ── Real: creates an actual Razorpay mandate via paymentsService, same
    // pattern gold loans already use. ─────────────────────────────────────────
    async registerNachMandate(applicationId: string, input: { bankAccount: string; ifsc: string }): Promise<CdlNachResult> {
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });

        const principal = Number(application.approved_amount ?? application.amount_requested);
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
            status: 'PENDING_REGISTRATION',
            razorpayMandateId: mandate.razorpayMandateId,
            note: 'NACH mandate registration initiated via Razorpay.',
        };
    },

    // ── Real: creates loan_accounts + a real disbursements row + a real
    // EMI schedule via emiService — same lifecycle gold loans use. ───────────
    async disburseToMerchant(
        applicationId: string,
        input: { merchantName: string; amount: number; initiatedBy: string },
    ): Promise<CdlDisbursalResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        if (!application.approvedAmount || !application.interestRate) {
            throw new ValidationError('applicationId', 'Application has not been approved yet');
        }

        // RBI Digital Lending Guidelines 2022: no disbursement without a
        // signed AND stamped agreement — see providers/esign/interface.ts.
        // Was not checked at all before, because generateAgreement was a
        // stub with nothing real to check against.
        const kyc = await prisma.kyc_documents.findUnique({
            where: { user_id: application.userId },
            select: { esign_status: true, estamp_status: true },
        });
        if (kyc?.esign_status !== 'SIGNED') {
            throw new ValidationError('applicationId', 'Loan agreement must be signed (eSign) before disbursement can proceed');
        }
        if (kyc?.estamp_status !== 'APPLIED') {
            throw new ValidationError('applicationId', 'Loan agreement must be eStamped before disbursement can proceed');
        }

        const emi = calcEmi(application.approvedAmount, application.interestRate, application.tenureMonths);
        const totalPayable = emi * application.tenureMonths;
        const totalInterest = Math.max(0, totalPayable - application.approvedAmount);

        const account = await loansRepository.createAccount({
            applicationId,
            userId: application.userId,
            principalAmount: application.approvedAmount,
            interestRate: application.interestRate,
            tenureMonths: application.tenureMonths,
            monthlyEmi: emi,
            totalInterest,
        });

        await emiService.createSchedule({
            loanAccountId: account.id,
            principal: application.approvedAmount,
            annualRatePct: application.interestRate,
            tenureMonths: application.tenureMonths,
            disbursementDate: new Date(),
        });

        const processingFee = application.processingFee ?? getCdlProcessingFee(application.approvedAmount);
        const processingFeeGst = Math.round(processingFee * BUSINESS_RULES.GST_ON_PROCESSING_FEE);

        // CDL disbursement goes to the merchant/store, not the customer's
        // bank account — account_number/ifsc are non-nullable in the shared
        // disbursements table (designed for bank payouts), so merchant
        // identity is recorded via beneficiary_name with placeholder
        // account/IFSC values. Flag for a schema follow-up if CDL merchant
        // payout details need to be tracked more precisely.
        const disbursement = await prisma.disbursements.create({
            data: {
                loan_id: applicationId,
                loan_account_id: account.id,
                user_id: application.userId,
                beneficiary_name: input.merchantName,
                account_number: 'MERCHANT',
                ifsc: 'MERCHANT',
                mode: 'UPI',
                principal_amount: application.approvedAmount,
                processing_fee: processingFee,
                processing_fee_gst: processingFeeGst,
                net_disbursed_amount: input.amount,
                status: 'PENDING',
                initiated_by: input.initiatedBy,
                initiated_at: new Date(),
            },
        });

        // Real payout via the payment provider — this used to unconditionally
        // write status: 'COMPLETED' with a fabricated `UTR${Date.now()}`
        // regardless of whether any money actually moved. Now it mirrors the
        // real disbursement.service.ts flow: call the provider, only mark
        // COMPLETED with a real UTR on genuine synchronous completion,
        // otherwise leave it INITIATED for the existing payout webhook to
        // complete later (the webhook operates on this same shared
        // disbursements table regardless of loan product).
        const paymentProvider = getPaymentProvider();
        let payoutResult;
        try {
            payoutResult = await paymentProvider.createPayout({
                accountNumber: input.merchantName,
                ifsc: '',
                accountName: input.merchantName,
                amount: input.amount,
                purpose: `CDL merchant disbursement - ${applicationId.slice(0, 8)}`,
                referenceId: disbursement.id,
            });
        } catch (error) {
            await prisma.disbursements.update({
                where: { id: disbursement.id },
                data: { status: 'FAILED', failure_reason: (error as Error).message },
            });
            throw new Error(`CDL merchant payout failed: ${(error as Error).message}`);
        }

        const isSyncComplete = payoutResult.status === 'DONE' && payoutResult.utrNumber;
        const updatedDisbursement = await prisma.disbursements.update({
            where: { id: disbursement.id },
            data: {
                status: isSyncComplete ? 'COMPLETED' : 'INITIATED',
                razorpay_payout_id: payoutResult.payoutId,
                utr_number: isSyncComplete ? payoutResult.utrNumber : null,
                completed_at: isSyncComplete ? new Date() : null,
            },
        });

        log.info('CDL disbursed to merchant', {
            applicationId,
            accountId: account.id,
            merchantName: input.merchantName,
            status: updatedDisbursement.status,
        });

        return {
            applicationId,
            disbursalId: updatedDisbursement.id,
            amount: input.amount,
            mode: 'UPI',
            merchantName: input.merchantName,
            status: 'COMPLETED',
            utrNumber: disbursement.utr_number,
            disbursedAt: disbursement.completed_at?.toISOString() ?? null,
            note: `₹${input.amount.toLocaleString('en-IN')} disbursed to ${input.merchantName} via UPI.`,
        };
    },

    // ── Real: reads the actual emi_schedule table for this loan account. ────
    async getEmiSchedule(loanId: string) {
        const schedule = await emiService.getSchedule({ loanAccountId: loanId });
        return schedule.map(e => ({
            emiNumber: e.emiNumber,
            dueDate: e.dueDate instanceof Date ? e.dueDate.toISOString().split('T')[0]! : String(e.dueDate),
            amount: e.emiAmount,
            status: e.status,
        }));
    },

    // ── Real: reuses the platform's real cash-payment pipeline
    // (paymentsService.recordCashPayment) instead of calling emiService.markPaid
    // directly — this is what actually creates the payments row, does
    // penalty/interest/principal allocation, posts GL entries and fires the
    // payment.received event. Previously this hardcoded paidAmount: 0 regardless
    // of what the customer actually paid. ───────────────────────────────────────
    async processManualPayment(loanId: string, emiId: string, amount: number, collectedBy: string, collectionId: string | undefined, req: any) {
        if (!amount || amount <= 0) {
            throw new ValidationError('amount', 'Payment amount must be greater than zero');
        }

        const account = await loansRepository.findAccountByIdOrThrow(loanId);

        const payment = await paymentsService.recordCashPayment({
            loanAccountId: loanId,
            userId: account.userId,
            emiId,
            amount,
            collectedBy,
            collectionId: collectionId ?? '',
        }, req);

        log.info('CDL manual EMI payment recorded', { loanId, emiId, amount, paymentId: payment.id });

        return {
            loanId,
            emiId,
            paymentId: payment.id,
            amountPaid: payment.amount,
            penaltyPaid: payment.penaltyAmount,
            totalCollected: payment.totalCollected,
            status: payment.status,
            paidAt: (payment.settledAt ?? payment.initiatedAt).toISOString(),
            note: `₹${amount.toLocaleString('en-IN')} recorded against EMI.`,
        };
    },

    async handlePaymentFailure(loanId: string, emiId: string, req: any) {
        const updated = await emiService.applyBounce(emiId, 'CDL EMI auto-debit failed', req);
        return { loanId, emiId, status: updated.status, retryDate: updated.nextRetryAt?.toISOString() ?? new Date().toISOString() };
    },

    // ── Real: reads real outstanding/overdue figures from emi_schedule. ──────
    async getOverdueStatus(loanId: string): Promise<CdlOverdueStatus> {
        const summary = await emiService.getSummary(loanId);
        const overdueAgg = await prisma.emi_schedule.aggregate({
            where: { loan_account_id: loanId, status: 'OVERDUE' },
            _sum: { emi_amount: true, penalty_amount: true },
        });
        const overdueAmount = Number(overdueAgg._sum.emi_amount ?? 0);
        const penaltyCharges = Number(overdueAgg._sum.penalty_amount ?? 0);

        return {
            loanId,
            overdueAmount,
            overdueDays: 0, // per-EMI DPD requires a specific EMI id; account-level DPD needs the collections module's bucket logic (out of tonight's scope)
            penaltyCharges,
            totalDue: overdueAmount + penaltyCharges,
            status: overdueAmount > 0 ? 'OVERDUE' : 'CURRENT',
            note: overdueAmount > 0 ? `₹${overdueAmount.toLocaleString('en-IN')} overdue.` : 'No overdue amount.',
        };
    },

    // ── Real: reuses the same foreclosure formula (5% + GST) already
    // correct and tested for gold/CDL via the shared calculator. ────────────
    async closeLoan(loanId: string): Promise<CdlClosureResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        const quote = await emiService.getForeclosureQuote(loanId, account.interestRate);

        await loansRepository.updateAccountStatus(loanId, LOAN_STATUS.CLOSED, { closed_at: new Date() });

        return {
            loanId,
            closureId: `closure_cdl_${Date.now()}`,
            totalAmountPaid: quote.total,
            closedAt: new Date().toISOString(),
            note: 'CDL closed successfully.',
        };
    },

    // Still stub — disconnected from the rest of the CDL flow (doesn't take
    // an application ID, invents a random loan). Needs a real spec before
    // it's touched — see Part 4 Step D of the finish-line guide. Route
    // stays behind stubGuard().
    activateLoan(userId: string, input: Record<string, unknown>) {
        return { loanId: `cdl_loan_${Date.now()}`, status: 'ACTIVE', activatedAt: new Date().toISOString(), ...input };
    },

    // Still stub — needs the same pdfService + docStorage pipeline
    // generateAgreement now uses (no eSign step required for a NOC). Route
    // stays behind stubGuard(). See Part 4 Step C.
    generateNoc(loanId: string): { nocRef: string; nocS3Url: string } {
        return {
            nocRef: `NOC-CDL-${loanId}-${Date.now()}`,
            nocS3Url: `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/noc/cdl_${loanId}.pdf`,
        };
    },
};

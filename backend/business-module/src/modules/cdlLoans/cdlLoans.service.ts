// src/modules/cdlLoans/cdlLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { prisma, withTransaction } from '@/config/database';
import { ValidationError, NotFoundError, LoanStateError } from '@/errors';
import { computeMonthlyEmi, buildAmortizationSchedule } from '@/modules/emi/emi.calculator';
import { emiService } from '@/modules/emi';
import { loansRepository } from '@/modules/loans/loans.repository';
import { paymentsService } from '@/modules/payments';
import { kycRepository } from '@/modules/kyc';
import { getPaymentProvider } from '@/providers';
import { pdfService } from '@/modules/documents/pdf.service';
import { getDocStorageProvider } from '@/providers/docStorage';
import { getEncryptionProvider } from '@/providers/encryption';
import { getESignProvider } from '@/providers/esign';
import { assertTransition } from '@/utils/loanStateMachine.util';
import { assertApplicationOwnership, assertAccountOwnership } from '@/utils/ownership.util';
import { generateLoanAccountNumber } from '@/utils/referenceNumber.util';
import { LOAN_STATUS, EMI_STATUS, PRODUCT_TYPE, BUSINESS_RULES } from '@/config/constants';
import type { Role } from '@/config/constants';
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

// Exported (not just for this file's own use) so cdlLoans.dto.ts's Joi
// schemas can validate against the exact same bounds instead of
// duplicating literal numbers that could drift out of sync.

// Discrete allowed rates per employment type — per client spec, not a range.
export const CDL_INTEREST_RATES: Record<'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT', number[]> = {
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

export const CDL_MIN_LOAN_AMOUNT = 7000;
export const CDL_MAX_LOAN_AMOUNT = 100000;
export const CDL_MIN_TENURE_MONTHS = 6;
export const CDL_MAX_TENURE_MONTHS = 12;
export const CDL_AUTO_DEBIT_DATES = [4, 7, 12];
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
            // Previously validated (must be one of CDL_AUTO_DEBIT_DATES)
            // then silently discarded — never persisted anywhere. Real
            // fix is only half done: this stores the customer's choice
            // (loan_applications.preferred_debit_day) so it's not thrown
            // away. It is NOT yet used to align EMI schedule due dates —
            // see disburseToMerchant below for why that half is
            // deliberately still open.
            preferredDebitDay: input.autoDebitDate,
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
    async runKycChecks(applicationId: string, callerId: string, callerRole: Role): Promise<CdlKycResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);
        assertApplicationOwnership(callerId, application, callerRole);

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
    async runComplianceChecks(applicationId: string, callerId: string, callerRole: Role): Promise<CdlComplianceResult> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);
        assertApplicationOwnership(callerId, application, callerRole);

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

    // ── Real: FOIR is still a pure calculation from caller-supplied income
    // figures (income verification isn't sourced from anywhere more
    // authoritative in this codebase yet — a separate, larger gap, not
    // addressed here). cibilScore is NOT caller-supplied any more: it's
    // read from the real, bureau-verified score already sitting in
    // kyc_documents.credit_score (populated by the actual bureau pull in
    // kyc.service.ts). Previously this took cibilScore directly from the
    // request body — a customer-role caller could submit any score from
    // 300-900 and the "assessment" would trust it outright, with no
    // independent verification at all. ───────────────────────────────────────
    async runCreditAssessment(
        applicationId: string,
        input: CdlCreditAssessmentInput,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlCreditAssessment> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);
        assertApplicationOwnership(callerId, application, callerRole);

        const kyc = await kycRepository.findByUserId(application.userId);
        if (kyc?.creditScore == null) {
            throw new ValidationError('creditScore', 'Credit bureau check has not been completed for this application');
        }
        const cibilScore = kyc.creditScore;

        const foir = Math.round(((input.existingEmis + input.proposedEmi) / input.monthlyIncome) * 100 * 10) / 10;
        const foirStatus = foir <= CDL_FOIR_LIMIT ? 'PASS' : 'FAIL';

        // CIBIL decision table per client spec:
        // 750+ auto-approve, 700-749 manual review, 650-699 reject, <650 reject,
        // no-hit/new-to-credit → manual review.
        const cibilDecision: 'PASS' | 'REVIEW' | 'FAIL' =
            cibilScore >= 750 ? 'PASS' :
            cibilScore >= 700 ? 'REVIEW' :
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
            cibilScore,
            foir,
            foirStatus,
            creditStatus,
            maxLoanAmount: creditStatus === 'PASS' ? maxLoan : 0,
            note: `CIBIL ${cibilScore}, FOIR ${foir}% — ${creditStatus}.`,
        };
    },

    // ── Real: persists the actual decision onto loan_applications. ───────────
    // Previously took `assessment: CdlCreditAssessment` — including
    // creditStatus and maxLoanAmount — directly from the request body and
    // used those values, completely trusted, for the actual approval
    // decision and DB write. A customer-role caller could call this
    // endpoint directly (skipping /credit-assessment entirely) with
    // {creditStatus:'PASS', maxLoanAmount:100000} and self-approve their
    // own application for the full requested amount, with zero real
    // underwriting. Now computes the decision itself via
    // runCreditAssessment (server-derived cibilScore, same ownership
    // check), so the client can no longer influence the outcome by what
    // it sends — only monthlyIncome/existingEmis/proposedEmi remain
    // caller-supplied, same as /credit-assessment. ───────────────────────────
    async getCreditDecision(
        applicationId: string,
        input: CdlCreditAssessmentInput,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlCreditDecision> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);
        assertApplicationOwnership(callerId, application, callerRole);

        const assessment = await cdlLoansService.runCreditAssessment(applicationId, input, callerId, callerRole);

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
    // pattern goldLoans.generateAgreement already uses. eSign/eStamp
    // request/status is stored on loan_applications (per-application —
    // see the migration fixing the per-user-vs-per-application bug,
    // 919f711), which the eSign webhook (POST /webhooks/esign,
    // /webhooks/signzy → kycService.processESignCallback) has also been
    // repointed at. ─────────────────────────────────────────────────────────
    async generateAgreement(applicationId: string, callerId: string, callerRole: Role): Promise<CdlAgreementResult> {
        log.info('Generating CDL agreement', { applicationId });

        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });
        assertApplicationOwnership(callerId, { userId: application.user_id }, callerRole);

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

        // esign_request_id/esign_status live on loan_applications, not
        // kyc_documents — per-AGREEMENT state (one row per application),
        // not per-user identity data. Fixed alongside the per-user-vs-
        // per-application eSign/eStamp bug (919f711 + the migration after it).
        await prisma.loan_applications.update({
            where: { id: applicationId },
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
    async completeESign(applicationId: string, callerId: string, callerRole: Role): Promise<CdlAgreementResult> {
        log.info('Checking eSign completion for CDL', { applicationId });

        // esign_request_id/esign_status/estamp_id/estamp_status are on this
        // same row now — no separate kyc_documents lookup needed for them.
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
        });
        assertApplicationOwnership(callerId, { userId: application.user_id }, callerRole);

        if (!application.esign_request_id) {
            throw new ValidationError('applicationId', 'No eSign request found — call the agreement step first');
        }

        const esign = getESignProvider();
        const signStatus = await esign.getSignStatus(application.esign_request_id);

        if (signStatus.status !== 'SIGNED') {
            return {
                applicationId,
                agreementId: `agreements/cdl/${applicationId}.pdf`,
                agreementUrl: '',
                status: 'PENDING',
                eSignRequestId: application.esign_request_id,
                stampDutyAmount: 100,
                note: `Signing not yet complete — current status: ${signStatus.status}.`,
            };
        }

        const customer = await prisma.customers.findUnique({
            where: { user_id: application.user_id },
            select: { state: true },
        });

        const stampResult = await esign.applyEStamp({
            requestId: application.esign_request_id,
            loanAmountRupees: Number(application.approved_amount ?? application.amount_requested),
            stateCode: customer?.state?.slice(0, 2).toUpperCase() ?? 'KA', // Placeholder mapping — pending a real state-name-to-code table, same as gold loan
        });

        const signedDoc = await esign.getSignedDocument(application.esign_request_id);
        const docStorage = getDocStorageProvider();
        const signedS3Key = `agreements/cdl/${applicationId}_signed.pdf`;
        await docStorage.upload({
            key: signedS3Key,
            fileBuffer: Buffer.from(signedDoc.documentBase64, 'base64'),
            contentType: 'application/pdf',
        });
        const { url: agreementUrl } = await docStorage.getSignedUrl(signedS3Key);

        await prisma.loan_applications.update({
            where: { id: applicationId },
            data: {
                esign_status: 'SIGNED',
                signed_agreement_s3_key: signedS3Key,
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
            eSignRequestId: application.esign_request_id,
            stampDutyAmount: stampResult.stampDutyRupees ?? 100,
            note: 'Agreement signed & stored. Proceeding to NACH setup.',
        };
    },

    // ── Real: creates an actual Razorpay mandate via paymentsService, same
    // pattern gold loans already use. ─────────────────────────────────────────
    async registerNachMandate(
        applicationId: string,
        input: { bankAccount: string; ifsc: string },
        callerId: string,
        callerRole: Role,
    ): Promise<CdlNachResult> {
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });
        assertApplicationOwnership(callerId, { userId: application.user_id }, callerRole);

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
        //
        // RESOLVED (was a per-user-vs-per-application bug — see commit
        // 919f711 for the original find and the migration that followed
        // it): esign_status/estamp_status now live on loan_applications,
        // one row per application, so this check can no longer be
        // satisfied by a different loan belonging to the same customer.
        const agreementStatus = await prisma.loan_applications.findUnique({
            where: { id: applicationId },
            select: { esign_status: true, estamp_status: true },
        });
        if (agreementStatus?.esign_status !== 'SIGNED') {
            throw new ValidationError('applicationId', 'Loan agreement must be signed (eSign) before disbursement can proceed');
        }
        if (agreementStatus?.estamp_status !== 'APPLIED') {
            throw new ValidationError('applicationId', 'Loan agreement must be eStamped before disbursement can proceed');
        }

        const emi = calcEmi(application.approvedAmount, application.interestRate, application.tenureMonths);
        const totalPayable = emi * application.tenureMonths;
        const totalInterest = Math.max(0, totalPayable - application.approvedAmount);

        const processingFee = application.processingFee ?? getCdlProcessingFee(application.approvedAmount);
        const processingFeeGst = Math.round(processingFee * BUSINESS_RULES.GST_ON_PROCESSING_FEE);

        // Previously three separate, non-transactional calls: createAccount
        // (loansRepository, its own internal transaction) → createSchedule
        // (emiService, its own separate internal transaction) →
        // disbursements.create (a third, bare call). If createSchedule
        // threw after createAccount had already committed, the result was
        // a loan_accounts row in DISBURSED status with no EMI schedule and
        // no disbursement record at all — and LOAN_STATUS's state machine
        // has no transition out of DISBURSED except → ACTIVE, so that
        // account was permanently stuck with no automated recovery path.
        // Now atomic: account, EMI schedule, and the disbursement's
        // initial PENDING row either all exist or none do. Inlined here
        // (rather than threading a shared `tx` param through
        // loansRepository.createAccount / emiService.createSchedule, which
        // are used by gold/housing loans too) to avoid touching those
        // shared call sites — the actual account-number generation and EMI
        // math are the same real logic (generateLoanAccountNumber,
        // buildAmortizationSchedule), just composed into one transaction
        // instead of three separate ones. The payment-provider call stays
        // OUTSIDE the transaction, after it commits — never hold a DB
        // transaction open across a network call.
        const accountNumber = await generateLoanAccountNumber();

        const { account, disbursement } = await withTransaction(async (tx) => {
            const accountRow = await tx.loan_accounts.create({
                data: {
                    application_id: applicationId,
                    user_id: application.userId,
                    account_number: accountNumber,
                    principal_amount: application.approvedAmount!,
                    interest_rate: application.interestRate!,
                    tenure_months: application.tenureMonths,
                    monthly_emi: emi,
                    outstanding_balance: application.approvedAmount! + totalInterest,
                    total_interest: totalInterest,
                    status: LOAN_STATUS.DISBURSED,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            });

            // NOT aligned to application.preferredDebitDay (the customer's
            // chosen 4th/7th/12th) — firstEmiDate defaults to
            // disbursementDate + 1 month, whatever day-of-month that lands
            // on, same as before. Deliberately left this way: the
            // client's own Consumer Loan Product Configuration spec,
            // section 1f "Loan Repayment Date", literally states
            // "Clarification required regarding repayment date
            // configuration" — this isn't a settled policy to implement,
            // it's an open question the client hasn't answered (e.g. if a
            // customer picks the 7th but disburses on the 20th, is the
            // first EMI the 7th ~18 days later, or the 7th of the month
            // after that, preserving a full month's grace?). Picking one
            // silently here would present a guess as a decided behavior.
            // preferredDebitDay IS now persisted (see submitApplication)
            // so it's available the moment this gets answered.
            const schedule = buildAmortizationSchedule({
                loanAccountId: accountRow.id,
                principal: application.approvedAmount!,
                annualRatePct: application.interestRate!,
                tenureMonths: application.tenureMonths,
                disbursementDate: new Date(),
            });
            await tx.emi_schedule.createMany({
                data: schedule.entries.map((e) => ({
                    loan_account_id: schedule.loanAccountId,
                    emi_number: e.emiNumber,
                    due_date: e.dueDate,
                    emi_amount: e.emiAmount,
                    principal_component: e.principalComponent,
                    interest_component: e.interestComponent,
                    outstanding_after: e.outstandingAfter,
                    status: EMI_STATUS.PENDING,
                    penalty_amount: 0,
                    bounce_count: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                })),
            });

            await tx.loan_applications.update({
                where: { id: applicationId },
                data: { status: LOAN_STATUS.DISBURSED, updated_at: new Date() },
            });

            // CDL disbursement goes to the merchant/store, not the
            // customer's bank account — account_number/ifsc are
            // non-nullable in the shared disbursements table (designed
            // for bank payouts), so merchant identity is recorded via
            // beneficiary_name with placeholder account/IFSC values. Flag
            // for a schema follow-up if CDL merchant payout details need
            // to be tracked more precisely.
            const disbursementRow = await tx.disbursements.create({
                data: {
                    loan_id: applicationId,
                    loan_account_id: accountRow.id,
                    user_id: application.userId,
                    beneficiary_name: input.merchantName,
                    account_number: 'MERCHANT',
                    ifsc: 'MERCHANT',
                    mode: 'UPI',
                    principal_amount: application.approvedAmount!,
                    processing_fee: processingFee,
                    processing_fee_gst: processingFeeGst,
                    net_disbursed_amount: input.amount,
                    status: 'PENDING',
                    initiated_by: input.initiatedBy,
                    initiated_at: new Date(),
                },
            });

            return { account: accountRow, disbursement: disbursementRow };
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

        // CDL disburses to the merchant in a single shot — "money confirmed
        // moved" and "loan should activate" are the same event, unlike
        // housing loans' tranche-based builder disbursement (a real,
        // distinct confirmation step there). Only activate on genuine
        // synchronous completion; the async case (isSyncComplete false)
        // is activated later by disbursement.service.ts's
        // _completeDisbursement once the payout webhook confirms it —
        // that function looks up this same account by application_id and
        // does not create a second one for CDL.
        //
        // Guarded, not assumed, even though DISBURSED→ACTIVE is the only
        // legal move from here — same safety pattern
        // housingLoans.service.ts's activateLoan already uses. The
        // disbursement-COMPLETED write and the account activation are now
        // atomic together too — previously two separate calls, so a
        // failure between them could leave the disbursement showing
        // COMPLETED while the account was still stuck at DISBURSED.
        if (isSyncComplete) {
            assertTransition(account.id, account.status, LOAN_STATUS.ACTIVE);
        }
        const updatedDisbursement = await withTransaction(async (tx) => {
            const disbursementRow = await tx.disbursements.update({
                where: { id: disbursement.id },
                data: {
                    status: isSyncComplete ? 'COMPLETED' : 'INITIATED',
                    razorpay_payout_id: payoutResult.payoutId,
                    utr_number: isSyncComplete ? payoutResult.utrNumber : null,
                    completed_at: isSyncComplete ? new Date() : null,
                },
            });
            if (isSyncComplete) {
                await tx.loan_accounts.update({
                    where: { id: account.id },
                    data: { status: LOAN_STATUS.ACTIVE, updated_at: new Date() },
                });
            }
            return disbursementRow;
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
            // Previously hardcoded 'COMPLETED' with the pre-update `disbursement`
            // object's (always-null) utr_number/completed_at, regardless of
            // whether the payout actually confirmed synchronously — a real,
            // successful async disbursement would still report
            // status: 'COMPLETED', utrNumber: null. Now reflects what actually
            // happened, from the post-update row.
            status: isSyncComplete ? 'COMPLETED' : 'PENDING',
            utrNumber: updatedDisbursement.utr_number,
            disbursedAt: updatedDisbursement.completed_at?.toISOString() ?? null,
            note: isSyncComplete
                ? `₹${input.amount.toLocaleString('en-IN')} disbursed to ${input.merchantName} via UPI.`
                : `₹${input.amount.toLocaleString('en-IN')} payout to ${input.merchantName} initiated; awaiting provider confirmation.`,
        };
    },

    // ── Real: reads the actual emi_schedule table for this loan account. ────
    async getEmiSchedule(loanId: string, callerId: string, callerRole: Role) {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

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
    async processManualPayment(
        loanId: string,
        emiId: string,
        amount: number,
        collectedBy: string,
        collectionId: string | undefined,
        req: any,
        callerId: string,
        callerRole: Role,
    ) {
        if (!amount || amount <= 0) {
            throw new ValidationError('amount', 'Payment amount must be greater than zero');
        }

        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

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

    async handlePaymentFailure(loanId: string, emiId: string, req: any, callerId: string, callerRole: Role) {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        const updated = await emiService.applyBounce(emiId, 'CDL EMI auto-debit failed', req);
        return { loanId, emiId, status: updated.status, retryDate: updated.nextRetryAt?.toISOString() ?? new Date().toISOString() };
    },

    // ── Real: reads real outstanding/overdue figures from emi_schedule. ──────
    async getOverdueStatus(loanId: string, callerId: string, callerRole: Role): Promise<CdlOverdueStatus> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        const summary = await emiService.getSummary(loanId);
        const overdueAgg = await prisma.emi_schedule.aggregate({
            where: { loan_account_id: loanId, status: 'OVERDUE' },
            _sum: { emi_amount: true, penalty_amount: true },
            _min: { due_date: true },
        });
        const overdueAmount = Number(overdueAgg._sum.emi_amount ?? 0);
        const penaltyCharges = Number(overdueAgg._sum.penalty_amount ?? 0);
        // Account-level DPD = days since the oldest overdue EMI's due date —
        // same formula collections.repository.ts's syncOverdueFigures already
        // uses (findFirst by due_date asc there; _min here since we already
        // aggregate this table for the amount figures above).
        const oldestDueDate = overdueAgg._min.due_date;
        const overdueDays = oldestDueDate
            ? Math.floor((Date.now() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            loanId,
            overdueAmount,
            overdueDays,
            penaltyCharges,
            totalDue: overdueAmount + penaltyCharges,
            status: overdueAmount > 0 ? 'OVERDUE' : 'CURRENT',
            note: overdueAmount > 0 ? `₹${overdueAmount.toLocaleString('en-IN')} overdue.` : 'No overdue amount.',
        };
    },

    // ── Real: reuses the same foreclosure formula (5% + GST) already
    // correct and tested for gold/CDL via the shared calculator. ────────────
    async closeLoan(loanId: string, callerId: string, callerRole: Role): Promise<CdlClosureResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        // Same check housingLoans.service.ts's closeLoan already has —
        // this one had no equivalent, so it closed unconditionally
        // regardless of remaining balance.
        const summary = await emiService.getSummary(loanId);
        if (summary.totalOutstanding > 0) {
            throw new LoanStateError(loanId, account.status, LOAN_STATUS.CLOSED);
        }

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

    // ── Real: pdfService.generateNoc already exists (housing loans already
    // use it) — this was just never actually calling it. Same pattern as
    // housingLoans.service.ts's generateNoc. ─────────────────────────────────
    async generateNoc(loanId: string, callerId: string, callerRole: Role): Promise<{ nocRef: string; nocS3Url: string }> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);
        if (account.status !== LOAN_STATUS.CLOSED) {
            throw new LoanStateError(loanId, account.status, LOAN_STATUS.CLOSED);
        }

        const pdfBuffer = await pdfService.generateNoc(loanId);

        const docStorage = getDocStorageProvider();
        const s3Key = `noc/cdl_${loanId}.pdf`;
        await docStorage.upload({
            key: s3Key,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
        });
        const { url } = await docStorage.getSignedUrl(s3Key);

        log.info('CDL NOC generated', { loanId });

        return {
            nocRef: `NOC-CDL-${loanId}-${Date.now()}`,
            nocS3Url: url,
        };
    },
};

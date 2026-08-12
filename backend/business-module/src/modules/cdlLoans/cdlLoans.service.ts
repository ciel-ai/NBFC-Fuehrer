// src/modules/cdlLoans/cdlLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { prisma, withTransaction } from '@/config/database';
import { ValidationError, NotFoundError, LoanStateError, ConflictError, CONFLICT_ERRORS } from '@/errors';
import { computeMonthlyEmi, buildAmortizationSchedule } from '@/modules/emi/emi.calculator';
import { emiService, emiRepository } from '@/modules/emi';
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
    CdlQuoteInput, CdlQuoteResult,
    CdlKycResult, CdlComplianceResult,
    CdlCreditAssessmentInput, CdlCreditAssessment,
    CdlCreditDecision, CdlAgreementResult,
    CdlNachInput, CdlNachResult, CdlDisbursalResult,
    CdlOverdueStatus, CdlClosureResult,
    CdlManualPaymentResult, CdlDocumentResult,
    CdlPartPaymentResult, CdlPartPaymentEmiApplication,
} from './cdlLoans.types';

const log = createModuleLogger('cdlLoans.service');

// ─── Constants ────────────────────────────────────────────────────────────────

// Exported (not just for this file's own use) so cdlLoans.dto.ts's Joi
// schemas can validate against the exact same bounds instead of
// duplicating literal numbers that could drift out of sync.

// Discrete allowed rates per employment type — per client spec, not a range.
// STUDENT previously had an entry here (defaulted to the SELF_EMPLOYED
// table, "until confirmed with client") — removed along with every other
// STUDENT reference in the CDL request validation/types it fed from. The
// client spec never defined a STUDENT rate; carrying an unconfirmed value
// through as if it were an approved product option was the actual gap.
export const CDL_INTEREST_RATES: Record<'SALARIED' | 'SELF_EMPLOYED', number[]> = {
    SALARIED: [0, 13, 14],
    SELF_EMPLOYED: [0, 14, 15],
};

// Flat tiered processing fee by loan amount band — per client spec, not a %.
const CDL_PROCESSING_FEE_TIERS: { max: number; fee: number }[] = [
    { max: 25000, fee: 1463 },
    { max: 50000, fee: 1817 },
    { max: 100000, fee: 2466 },
];

// loan_applications.purpose for every CDL application. The column is the
// generic loan-purpose field (housing writes its property type there, gold its
// own value) and is NOT NULL, so CDL has to write something — this is the
// honest answer. It used to hold a duplicate of the product name, which left
// "what was financed" and "why the loan was taken" indistinguishable.
export const CDL_LOAN_PURPOSE = 'Consumer durable purchase';

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
            throw new ValidationError('interestRate', `${requested}% is not a valid rate for ${employmentType}. Allowed: ${allowed.join(', ')}%`);
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

function validateCdlLoanParams(loanAmount: number, tenureMonths: number, preferredDebitDay?: number): void {
    if (loanAmount < CDL_MIN_LOAN_AMOUNT || loanAmount > CDL_MAX_LOAN_AMOUNT) {
        throw new ValidationError('loanAmount', `Loan amount must be between ₹${CDL_MIN_LOAN_AMOUNT.toLocaleString('en-IN')} and ₹${CDL_MAX_LOAN_AMOUNT.toLocaleString('en-IN')}`);
    }
    if (tenureMonths < CDL_MIN_TENURE_MONTHS || tenureMonths > CDL_MAX_TENURE_MONTHS) {
        throw new ValidationError('tenureMonths', `Tenure must be between ${CDL_MIN_TENURE_MONTHS} and ${CDL_MAX_TENURE_MONTHS} months`);
    }
    if (preferredDebitDay !== undefined && !CDL_AUTO_DEBIT_DATES.includes(preferredDebitDay)) {
        throw new ValidationError('preferredDebitDay', `Auto-debit day must be one of: ${CDL_AUTO_DEBIT_DATES.join(', ')}`);
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
    // ── Quote: authoritative EMI + processing fee, no side effects ───────────
    // The product-details screen renders what this returns. It runs the same
    // calcEmi / getCdlProcessingFee / getCdlInterestRate the booking path uses,
    // so the figure quoted is by construction the figure the loan is written
    // at — there is no second implementation to drift.
    //
    // totalInterest/totalPayable come from buildAmortizationSchedule (the same
    // schedule builder disburseToMerchant uses for the real, booked loan) —
    // NOT emi * tenureMonths. That shortcut silently disagrees with the real
    // schedule once the final installment absorbs a rounding residual (see
    // buildAmortizationSchedule's own invariants at the top of
    // emi.calculator.ts), which is exactly the discrepancy a pre-application
    // quote must not introduce. loanAccountId is a placeholder — this call
    // creates no account and the schedule's aggregate totals don't depend on
    // it; only buildAmortizationSchedule's per-entry rows (unused here) would.
    quote(input: CdlQuoteInput): CdlQuoteResult {
        const financeable = input.productValue - input.downPayment;
        if (input.downPayment > input.productValue) {
            throw new ValidationError('downPayment', 'Down payment cannot exceed the product value');
        }
        if (input.loanAmount > financeable) {
            throw new ValidationError(
                'loanAmount',
                `Loan amount cannot exceed the product value after down payment (₹${financeable.toLocaleString('en-IN')})`,
            );
        }
        validateCdlLoanParams(input.loanAmount, input.tenureMonths);

        const interestRate = getCdlInterestRate(input.employmentType, input.interestRate);
        const schedule = buildAmortizationSchedule({
            loanAccountId: '',
            principal: input.loanAmount,
            annualRatePct: interestRate,
            tenureMonths: input.tenureMonths,
            disbursementDate: new Date(),
        });
        const processingFee = getCdlProcessingFee(input.loanAmount);
        const processingFeeGst = Math.round(processingFee * BUSINESS_RULES.GST_ON_PROCESSING_FEE);

        return {
            loanAmount: input.loanAmount,
            tenureMonths: input.tenureMonths,
            interestRate,
            emi: schedule.monthlyEmi,
            processingFee,
            processingFeeGst,
            totalInterest: schedule.totalInterest,
            // Named totalAmount (not totalPayable) — see the field's doc
            // comment in cdlLoans.types.ts for why.
            totalAmount: schedule.totalPayable,
            maxEligibleAmount: Math.min(financeable, CDL_MAX_LOAN_AMOUNT),
        };
    },

    /**
     * @param userId  the CUSTOMER the application belongs to — not the caller.
     * @param options.agentId  set when a sales agent files on the customer's
     *   behalf, so the application records who originated it. The customer app
     *   omits it. Everything else (bounds, rate table, EMI, fee, duplicate
     *   check, initial status) is identical for both flows by construction —
     *   the sales wizard calls this method rather than reimplementing it.
     */
    async submitApplication(
        userId: string,
        input: CdlApplicationInput,
        options?: { agentId?: string },
    ): Promise<CdlApplicationResult> {
        validateCdlLoanParams(input.loanAmount, input.tenureMonths, input.preferredDebitDay);

        // Previously missing entirely — a customer could submit unlimited
        // simultaneous CDL applications. loansRepository.hasActiveApplication
        // already exists and is already used by the generic loans.service.ts
        // for this exact check; reused as-is, same error, so this reads as
        // the same validation the rest of the platform already gives
        // customers, not a CDL-specific variant.
        const hasActive = await loansRepository.hasActiveApplication(userId);
        if (hasActive) throw CONFLICT_ERRORS.duplicateApplication(userId);

        const interestRate = getCdlInterestRate(input.employmentType, input.interestRate);
        const emi = calcEmi(input.loanAmount, interestRate, input.tenureMonths);
        const processingFee = getCdlProcessingFee(input.loanAmount);

        const customer = await loansRepository.findCustomerByUserId(userId);

        const created = await loansRepository.createApplication({
            userId,
            agentId: options?.agentId ?? null,
            customerId: customer?.id ?? null,
            amountRequested: input.loanAmount,
            tenureMonths: input.tenureMonths,
            productType: PRODUCT_TYPE.CONSUMER_DURABLE,
            productName: input.productName,
            // `purpose` is the generic loan-purpose column gold and housing
            // also use, and it is NOT NULL — so CDL must write something. It
            // now writes the actual purpose of the loan instead of a second
            // copy of the product name. Readers that want the item read
            // productName (with a `?? purpose` fallback for rows written
            // before 20260813010000_add_cdl_product_name).
            purpose: CDL_LOAN_PURPOSE,
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
            preferredDebitDay: input.preferredDebitDay,
            // The three CDL product facts. Validated since the DTO was
            // written, ignored here until loan_applications gained columns
            // for them (migration 20260813000000_add_cdl_product_fields) —
            // every CDL application before that lost the invoice value, the
            // down payment and the category the moment Joi handed them over.
            productValue: input.productValue,
            downPayment: input.downPayment,
            productCategory: input.productCategory,
            // The employment type used to derive `interestRate` two lines
            // above — persisted so it becomes the authoritative value for
            // every later CDL step (credit assessment, auto-approval),
            // rather than something each of those has to be separately
            // trusted to receive correctly in its own request body. See
            // loan_applications.employment_type's own comment.
            employmentType: input.employmentType,
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
            productName: input.productName,
            productValue: input.productValue,
            downPayment: input.downPayment,
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

        // Idempotency guard — previously none at all. Calling this twice
        // (retry, double-tap, or just calling it again) would silently
        // generate a SECOND real eSign request and overwrite esign_status
        // back to the new request's unsigned initial state. If the
        // customer had already completed Aadhaar-OTP signing on the first
        // request, that completed signature was orphaned: the DB now
        // pointed at a new, never-signed request, and completeESign's
        // poll would check the wrong one forever.
        if (application.esign_status === 'SIGNED') {
            if (!application.signed_agreement_s3_key) {
                // Shouldn't happen — SIGNED is only ever set alongside
                // signed_agreement_s3_key, in completeESign — but fail
                // loudly rather than silently regenerating if it did.
                throw new ConflictError('Application is marked SIGNED but has no stored signed agreement on file — data inconsistency, contact support');
            }
            const { url: signedUrl } = await getDocStorageProvider().getSignedUrl(application.signed_agreement_s3_key);
            log.info('generateAgreement called on an already-signed application — returning existing signed document, not regenerating', { applicationId });
            return {
                applicationId,
                agreementId: application.signed_agreement_s3_key,
                agreementUrl: signedUrl,
                status: 'SIGNED',
                eSignRequestId: application.esign_request_id,
                stampDutyAmount: 100,
                note: 'Agreement already signed — returning the existing signed document.',
            };
        }
        if (application.esign_request_id && application.esign_status === 'PENDING') {
            // A signing request already exists and hasn't resolved yet —
            // don't burn a second real eSign-provider call or hand out a
            // second, confusing signing link. FAILED/EXPIRED/CANCELLED
            // are deliberately NOT blocked here — those are genuine dead
            // ends the customer needs a fresh request to recover from.
            throw new ConflictError(
                'A signing request for this agreement is already in progress — check its status via the eSign endpoint instead of generating a new one.',
                { applicationId, existingEsignRequestId: application.esign_request_id, existingStatus: application.esign_status },
            );
        }

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
        input: CdlNachInput,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlNachResult> {
        const application = await prisma.loan_applications.findUniqueOrThrow({
            where: { id: applicationId },
            include: { user: { select: { full_name: true, phone: true } } },
        });
        assertApplicationOwnership(callerId, { userId: application.user_id }, callerRole);

        // Previously missing entirely — a real Razorpay mandate could be
        // registered against a DRAFT or REJECTED application, one that
        // was never approved. Ownership is checked first, deliberately —
        // a caller who doesn't own this application gets ForbiddenError,
        // not a LoanStateError that would reveal the application's status
        // to them. Same state-guard idiom housingLoans.service.ts already
        // uses for its own preconditions (LoanStateError doesn't take a
        // free-text message — its constructor derives one from
        // current/expected status).
        if (application.status !== LOAN_STATUS.APPROVED) {
            throw new LoanStateError(applicationId, application.status, LOAN_STATUS.APPROVED);
        }

        // The customer can still change their auto-debit day at NACH setup —
        // this is the screen that actually asks for it. Previously the app
        // sent it as `autoDebitDate` and stripUnknown discarded it, so the
        // choice made here was lost and the application's original day stood.
        if (
            input.preferredDebitDay !== undefined &&
            input.preferredDebitDay !== application.preferred_debit_day
        ) {
            await prisma.loan_applications.update({
                where: { id: applicationId },
                data: {
                    preferred_debit_day: input.preferredDebitDay,
                    updated_at: new Date(),
                },
            });
        }

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

        // Audit finding — totalInterest/outstanding_balance were previously
        // derived from `emi * tenureMonths`, a shortcut that silently
        // disagrees with the real schedule once the final installment
        // absorbs a rounding residual (see buildAmortizationSchedule's own
        // invariants at the top of emi.calculator.ts). The schedule is the
        // authoritative source of truth for both totals — built once here
        // (its aggregate totals don't depend on loanAccountId, so a
        // placeholder is fine; the real account id is substituted per-row
        // below when the schedule is actually persisted inside the
        // transaction) rather than recomputed a second time from scratch.
        // `emi` is read off the same schedule instead of a separate calcEmi
        // call so the two can never drift apart by construction.
        const schedule = buildAmortizationSchedule({
            loanAccountId: '',
            principal: application.approvedAmount,
            annualRatePct: application.interestRate,
            tenureMonths: application.tenureMonths,
            disbursementDate: new Date(),
        });
        const emi = schedule.monthlyEmi;
        const totalInterest = schedule.totalInterest;

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
            // `schedule` was already built above (outside the transaction)
            // to derive totalInterest/emi — reused here rather than
            // rebuilding it a second time. Its entries carry the placeholder
            // loanAccountId from that earlier call, so accountRow.id (the
            // real id, only known now) is substituted explicitly below.
            await tx.emi_schedule.createMany({
                data: schedule.entries.map((e) => ({
                    loan_account_id: accountRow.id,
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
        requestedAmount: number | undefined,
        collectedBy: string,
        collectionId: string | undefined,
        req: any,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlManualPaymentResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        // The payable amount is the EMI's, not the caller's. The customer app
        // pays a whole EMI and sends no amount at all; a staff cash collection
        // may send one, and it is checked against the real due before we take
        // it. Trusting a client-supplied figure outright would let a customer
        // settle a ₹4,212 EMI by asserting ₹1.
        const emi = await prisma.emi_schedule.findUnique({ where: { id: emiId } });
        if (!emi) throw new NotFoundError('EMI', emiId);
        if (emi.loan_account_id !== loanId) {
            throw new ValidationError('emiId', 'This EMI does not belong to the specified loan');
        }

        const dueAmount = Number(emi.emi_amount) + Number(emi.penalty_amount ?? 0);
        const amount = requestedAmount ?? dueAmount;

        if (amount <= 0) {
            throw new ValidationError('amount', 'Payment amount must be greater than zero');
        }
        if (amount > dueAmount) {
            throw new ValidationError(
                'amount',
                `Payment amount ₹${amount.toLocaleString('en-IN')} exceeds the amount due on this EMI (₹${dueAmount.toLocaleString('en-IN')})`,
            );
        }

        const payment = await paymentsService.recordCashPayment({
            loanAccountId: loanId,
            userId: account.userId,
            emiId,
            amount,
            collectedBy,
            collectionId: collectionId ?? '',
        }, req);

        log.info('CDL manual EMI payment recorded', { loanId, emiId, amount, paymentId: payment.id });

        // Audit finding #14 — pdfService.generatePaymentReceipt already
        // existed, real and working, but CDL never called it. Same
        // generate → upload → getSignedUrl shape generateNoc already
        // uses. Keyed by payment.id specifically (not emiId/loanId) —
        // this is the actual payment record the receipt describes.
        const receiptBuffer = await pdfService.generatePaymentReceipt(payment.id);
        const docStorage = getDocStorageProvider();
        const receiptKey = `receipts/cdl_${payment.id}.pdf`;
        await docStorage.upload({
            key: receiptKey,
            fileBuffer: receiptBuffer,
            contentType: 'application/pdf',
        });
        const { url: receiptUrl } = await docStorage.getSignedUrl(receiptKey);

        return {
            loanId,
            emiId,
            paymentId: payment.id,
            amountPaid: payment.amount,
            penaltyPaid: payment.penaltyAmount,
            totalCollected: payment.totalCollected,
            status: payment.status,
            paidAt: (payment.settledAt ?? payment.initiatedAt).toISOString(),
            receiptUrl,
            note: `₹${amount.toLocaleString('en-IN')} recorded against EMI.`,
        };
    },

    // ── Real: audit finding #15 — a generic lump-sum part-payment, applied
    // across whichever EMIs are actually due, oldest first, rather than
    // processManualPayment's single named EMI. Per the client spec
    // (Section 8, "Foreclosure & Part Payment").
    //
    // CORRECTNESS — allocatePartialPayment (emi.calculator.ts) computes
    // but never returns any surplus beyond a single EMI's own due; call
    // it with more than that EMI owes and the excess is silently
    // discarded. That's a real, separate, pre-existing bug in the
    // shared payment path (see the commit for this fix) — NOT fixed
    // here. To avoid tripping it, every call into
    // paymentsService.recordCashPayment below is capped to exactly the
    // current EMI's own true remaining due, read directly off
    // emi_schedule's own emi_amount/penalty_amount columns
    // (recordPartialPayment decrements these in place on every prior
    // partial settlement, so they're always the real remaining due,
    // never the original scheduled amount) — never the raw remaining
    // lump sum.
    //
    // req is not in the task's illustrative signature but is required —
    // recordCashPayment needs it (audit context, event requestId), and
    // every other CDL method that calls into the payments module takes
    // one (see processManualPayment above); added here in the same
    // position for consistency.
    async partPayment(
        loanId: string,
        amount: number,
        collectedBy: string,
        collectionId: string | undefined,
        req: any,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlPartPaymentResult> {
        if (!amount || amount <= 0) {
            throw new ValidationError('amount', 'Payment amount must be greater than zero');
        }

        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        // Cap upfront against the account's real total outstanding (same
        // emiService.getSummary closeLoan already uses). This codebase
        // has no overpayment-credit-balance concept anywhere — rather
        // than invent one here, an amount that exceeds what's actually
        // owed is rejected outright, before a single EMI is touched.
        const summary = await emiService.getSummary(loanId);
        if (amount > summary.totalOutstanding) {
            throw new ValidationError(
                'amount',
                `Amount exceeds total outstanding of ₹${summary.totalOutstanding.toLocaleString('en-IN')}`,
            );
        }

        const emisApplied: CdlPartPaymentEmiApplication[] = [];
        let remainingLumpSum = amount;

        while (remainingLumpSum > 0) {
            const emi = await emiRepository.findNextDueEmi(loanId);
            if (!emi) break; // fully settled — shouldn't happen given the upfront cap above, but the loop must still terminate correctly if it does.

            const thisEmiDue = emi.emiAmount + emi.penaltyAmount;
            const cappedAmount = Math.min(remainingLumpSum, thisEmiDue);

            if (cappedAmount <= 0) {
                // Defensive: shouldn't be reachable given the upfront
                // cap, but a due EMI with a zero remaining due would
                // otherwise spin forever re-selecting itself.
                log.warn('CDL part-payment: next due EMI has zero due but lump sum remains — stopping', {
                    loanId, emiId: emi.id, remainingLumpSum,
                });
                break;
            }

            const payment = await paymentsService.recordCashPayment({
                loanAccountId: loanId,
                userId: account.userId,
                emiId: emi.id,
                amount: cappedAmount,
                collectedBy,
                collectionId: collectionId ?? '',
            }, req);

            // Audit finding #14's receipt pattern, reused per-EMI — each
            // is a distinct payment record against a distinct EMI, same
            // as if the customer had paid each one individually.
            const receiptBuffer = await pdfService.generatePaymentReceipt(payment.id);
            const docStorage = getDocStorageProvider();
            const receiptKey = `receipts/cdl_${payment.id}.pdf`;
            await docStorage.upload({
                key: receiptKey,
                fileBuffer: receiptBuffer,
                contentType: 'application/pdf',
            });
            const { url: receiptUrl } = await docStorage.getSignedUrl(receiptKey);

            emisApplied.push({
                emiId: emi.id,
                emiNumber: emi.emiNumber,
                amountApplied: cappedAmount,
                paymentId: payment.id,
                receiptUrl,
                // cappedAmount can never exceed thisEmiDue (Math.min
                // above) — it only equals it when the full due was
                // covered this call.
                resultingStatus: cappedAmount >= thisEmiDue ? EMI_STATUS.PAID : EMI_STATUS.PARTIAL,
            });

            remainingLumpSum -= cappedAmount;
        }

        const totalAmountApplied = emisApplied.reduce((sum, e) => sum + e.amountApplied, 0);
        const updatedSummary = await emiService.getSummary(loanId);

        log.info('CDL part-payment recorded', {
            loanId, totalAmountApplied, emisTouched: emisApplied.length,
        });

        return {
            loanId,
            totalAmountApplied,
            emisApplied,
            remainingOutstanding: updatedSummary.totalOutstanding,
            fullyPaidOff: updatedSummary.totalOutstanding === 0,
            note: `₹${totalAmountApplied.toLocaleString('en-IN')} applied across ${emisApplied.length} EMI(s).`,
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

        // Audit finding #14 — pdfService.generateClosureLetter already
        // existed but CDL never called it. Deliberately generated AFTER
        // the status update above succeeds, not before — if that update
        // were to fail, no closure letter should exist for a loan that
        // isn't actually closed.
        const letterBuffer = await pdfService.generateClosureLetter(loanId);
        const docStorage = getDocStorageProvider();
        const letterKey = `closure-letters/cdl_${loanId}.pdf`;
        await docStorage.upload({
            key: letterKey,
            fileBuffer: letterBuffer,
            contentType: 'application/pdf',
        });
        const { url: closureLetterUrl } = await docStorage.getSignedUrl(letterKey);

        return {
            loanId,
            closureId: `closure_cdl_${Date.now()}`,
            totalAmountPaid: quote.total,
            closedAt: new Date().toISOString(),
            closureLetterUrl,
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

    // ── Real: pdfService.generateLoanStatement already exists but CDL
    // never called it (audit finding #14). On-demand, not tied to a
    // lifecycle action — a customer can want their statement at any
    // point, not just at one moment. Generates a fresh document + URL on
    // every call rather than caching: a statement goes stale as EMIs get
    // paid, and this module has no document-versioning story, so
    // regenerating is the safe default. ──────────────────────────────────
    async getLoanStatement(loanId: string, callerId: string, callerRole: Role): Promise<CdlDocumentResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        const pdfBuffer = await pdfService.generateLoanStatement(loanId);

        const docStorage = getDocStorageProvider();
        const s3Key = `statements/cdl_${loanId}_${Date.now()}.pdf`;
        await docStorage.upload({
            key: s3Key,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
        });
        const { url } = await docStorage.getSignedUrl(s3Key);

        log.info('CDL loan statement generated', { loanId });

        return {
            documentRef: s3Key,
            documentUrl: url,
        };
    },

    // ── Real: pdfService.generateRepaymentSchedule already exists but CDL
    // never called it (audit finding #14). Same on-demand,
    // always-regenerate reasoning as getLoanStatement above. Unlike
    // getEmiSchedule (returns the raw schedule as JSON for in-app
    // display), this returns a downloadable PDF — the spec's "Repayment
    // schedule download" item specifically. ──────────────────────────────
    async getRepaymentSchedule(loanId: string, callerId: string, callerRole: Role): Promise<CdlDocumentResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        const pdfBuffer = await pdfService.generateRepaymentSchedule(loanId);

        const docStorage = getDocStorageProvider();
        const s3Key = `repayment-schedules/cdl_${loanId}.pdf`;
        await docStorage.upload({
            key: s3Key,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
        });
        const { url } = await docStorage.getSignedUrl(s3Key);

        log.info('CDL repayment schedule generated', { loanId });

        return {
            documentRef: s3Key,
            documentUrl: url,
        };
    },

    // ── Real: pdfService.generateInterestCertificate already exists but
    // CDL never called it (audit finding #14). Unlike the other document
    // generators here, this one takes a financialYear (e.g. "2025-26"),
    // not just loanAccountId — interest certificates are typically needed
    // for a specific past tax year, not just "now", so financialYear is
    // accepted as an optional param and defaults to the current Indian
    // financial year (April-March) when the caller doesn't specify one. ──
    async getInterestCertificate(
        loanId: string,
        financialYear: string | undefined,
        callerId: string,
        callerRole: Role,
    ): Promise<CdlDocumentResult> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        assertAccountOwnership(callerId, account, callerRole);

        const fy = financialYear ?? getCurrentFinancialYear();
        const pdfBuffer = await pdfService.generateInterestCertificate(loanId, fy);

        const docStorage = getDocStorageProvider();
        const s3Key = `interest-certificates/cdl_${loanId}_${fy}.pdf`;
        await docStorage.upload({
            key: s3Key,
            fileBuffer: pdfBuffer,
            contentType: 'application/pdf',
        });
        const { url } = await docStorage.getSignedUrl(s3Key);

        log.info('CDL interest certificate generated', { loanId, financialYear: fy });

        return {
            documentRef: s3Key,
            documentUrl: url,
        };
    },
};

// India's financial year runs April 1 - March 31, formatted "YYYY-YY"
// (e.g. "2026-27"). Used only as getInterestCertificate's default when
// the caller doesn't specify one explicitly.
function getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const isBeforeApril = now.getMonth() < 3; // getMonth() is 0-indexed; 3 = April
    const startYear = isBeforeApril ? year - 1 : year;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

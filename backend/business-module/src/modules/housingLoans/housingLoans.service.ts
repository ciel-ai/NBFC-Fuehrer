// src/modules/housingLoans/housingLoans.service.ts
import { createModuleLogger } from '@/config/logger';
import { housingLoansRepository } from './housingLoans.repository';
import { loansRepository } from '@/modules/loans/loans.repository';
import { LOAN_STATUS, PRODUCT_TYPE } from '@/config/constants';
import { NotFoundError, LoanStateError, ValidationError } from '@/errors';
import { prisma } from '@/config/database';
import { emiService } from '@/modules/emi';
import { assertTransition } from '@/utils/loanStateMachine.util';
import { pdfService } from '@/modules/documents/pdf.service';
import { getDocStorageProvider } from '@/providers/docStorage';
import { getEncryptionProvider } from '@/providers/encryption';
import { getESignProvider } from '@/providers/esign';
import { paymentsService } from '@/modules/payments';
import { disbursementService } from '@/modules/disbursement';
import type {
    HousingApplicationInput,
    HousingApplicationResult,
    HousingApplicant,
    HousingKycResult,
    HousingComplianceResult,
    HousingIncomeAssessmentInput,
    HousingIncomeAssessment,
    HousingCreditAssessmentInput,
    HousingCreditAssessment,
    HousingPropertyAssessmentInput,
    HousingPropertyAssessment,
    HousingDecision,
    HousingAgreementResult,
    HousingNachInput,
    HousingNachResult,
    HousingPmaySubsidyInput,
    HousingPmaySubsidyResult,
    HousingDisbursalInput,
    HousingDisbursalResult,
    HousingOverdueStatus,
    HousingPrepaymentQuote,
    HousingPrepaymentResult,
    HousingClosureResult,
} from './housingLoans.types';

const log = createModuleLogger('housingLoans.service');

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUSING_INTEREST_RATE = 9.5;
const MAX_LTV               = 80;
const PROCESSING_FEE_PCT    = 0.5;
const MAX_FOIR              = 50;

// ─── EMI formula ──────────────────────────────────────────────────────────────

function calcEmi(principal: number, annualRate: number, months: number): number {
    const r = annualRate / 12 / 100;
    if (r === 0) return Math.round(principal / months);
    return Math.round(
        (principal * r * Math.pow(1 + r, months)) /
        (Math.pow(1 + r, months) - 1),
    );
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const housingLoansService = {

    // ── POST /housing-loans/applications ─────────────────────────────────────
    // Creates a real loan_application row via loansRepository

    async submitApplication(
        input: HousingApplicationInput,
        userId: string,
    ): Promise<HousingApplicationResult> {
        const emi           = calcEmi(input.loanAmount, HOUSING_INTEREST_RATE, input.tenureMonths);
        const processingFee = Math.round(input.loanAmount * PROCESSING_FEE_PCT / 100);

        // Upsert customer profile
        const customer = await loansRepository.upsertCustomer({
            userId,
            city:    input.propertyCity,
            state:   input.propertyState,
            pincode: input.propertyPincode,
        });

        // Create loan application
        const application = await loansRepository.createApplication({
            userId,
            agentId:         null,
            customerId:      customer.id,
            amountRequested: input.loanAmount,
            tenureMonths:    input.tenureMonths,
            productType:     PRODUCT_TYPE.HOUSING_LOAN,
            purpose:         input.propertyType,
            storeName:       input.propertyAddress,
            storeCity:       input.propertyCity,
            monthlyIncome:   input.monthlyIncome,
            repaymentType:   'MONTHLY_EMI',
            appliedAt:       new Date(),
        });

        log.info('Housing loan application created', {
            applicationId: application.id,
            userId,
            loanAmount: input.loanAmount,
        });

        return {
            applicationId:   application.id,
            referenceNumber: application.referenceNumber,
            status:          application.status,
            loanAmount:      input.loanAmount,
            tenureMonths:    input.tenureMonths,
            interestRate:    HOUSING_INTEREST_RATE,
            monthlyEmi:      emi,
            processingFee,
            createdAt:       application.appliedAt.toISOString(),
            note:            'Application created. Please complete KYC to proceed.',
        };
    },

    // ── POST /housing-loans/applications/:id/kyc ──────────────────────────────
    // Stub — will be replaced with Signzy KYC call

    runKyc(applicationId: string, _applicant: HousingApplicant): HousingKycResult {
        log.info('Running KYC for housing loan', { applicationId });
        return {
            applicationId,
            kycStatus:       'PASSED',
            aadhaarVerified: true,
            panVerified:     true,
            faceMatchScore:  92,
            note:            'KYC verification completed successfully.',
        };
    },

    // ── POST /housing-loans/applications/:id/compliance ───────────────────────
    // Stub — will be replaced with Signzy AML/PEP check

    runCompliance(applicationId: string): HousingComplianceResult {
        log.info('Running compliance for housing loan', { applicationId });
        return {
            applicationId,
            amlStatus:     'PASSED',
            pepStatus:     'PASSED',
            overallStatus: 'PASSED',
            flags:         [],
            note:          'All compliance checks passed.',
        };
    },

    // ── POST /housing-loans/applications/:id/income-assessment ────────────────

    runIncomeAssessment(
        applicationId: string,
        input: HousingIncomeAssessmentInput,
    ): HousingIncomeAssessment {
        const proposedEmi      = calcEmi(500000, HOUSING_INTEREST_RATE, 120);
        const foir             = Math.round(
            ((input.existingEmis + proposedEmi) / input.monthlyIncome) * 100 * 10,
        ) / 10;
        const foirStatus       = foir <= MAX_FOIR ? 'PASS' : 'FAIL';
        const maxEligibleEmi   = (input.monthlyIncome * MAX_FOIR / 100) - input.existingEmis;
        const maxEligibleAmount = Math.round(
            maxEligibleEmi *
            (1 - Math.pow(1 + HOUSING_INTEREST_RATE / 12 / 100, -240)) /
            (HOUSING_INTEREST_RATE / 12 / 100),
        );

        return {
            applicationId,
            monthlyIncome:     input.monthlyIncome,
            existingEmis:      input.existingEmis,
            proposedEmi,
            foir,
            foirStatus,
            maxEligibleAmount,
            note: foirStatus === 'PASS'
                ? `FOIR ${foir}% is within limit of ${MAX_FOIR}%.`
                : `FOIR ${foir}% exceeds limit of ${MAX_FOIR}%.`,
        };
    },

    // ── POST /housing-loans/applications/:id/credit-assessment ────────────────
    // Stub — will be replaced with bureau API call

    runCreditAssessment(
        applicationId: string,
        input: HousingCreditAssessmentInput,
    ): HousingCreditAssessment {
        const creditStatus = input.cibilScore >= 650 && input.overdueAccounts === 0
            ? 'PASS'
            : input.cibilScore >= 600
                ? 'REVIEW'
                : 'FAIL';
        const rate = input.cibilScore >= 750 ? 8.5
            : input.cibilScore >= 700 ? 9.0
                : HOUSING_INTEREST_RATE;

        return {
            applicationId,
            cibilScore:              input.cibilScore,
            creditStatus,
            maxLoanAmount:           creditStatus === 'PASS' ? 5000000 : 0,
            recommendedInterestRate: rate,
            note:                    `CIBIL score ${input.cibilScore} — ${creditStatus}.`,
        };
    },

    // ── POST /housing-loans/applications/:id/property-assessment ─────────────
    // Real — writes to collateral_property, transitions loan to PROPERTY_ASSESSMENT

    async runPropertyAssessment(
        input: HousingPropertyAssessmentInput,
    ): Promise<HousingPropertyAssessment> {
        const application = await loansRepository.findApplicationByIdOrThrow(input.loanId);

        if (application.status !== LOAN_STATUS.UNDERWRITING) {
            throw new LoanStateError(
                input.loanId,
                application.status,
                LOAN_STATUS.PROPERTY_ASSESSMENT,
            );
        }

        const maxLoan = Math.round(input.estimatedMarketValue * MAX_LTV / 100);

        // Write collateral record
        const collateral = await housingLoansRepository.createCollateralProperty({
            loanId:            input.loanId,
            propertyType:      input.propertyType,
            address:           input.address,
            marketValue:       input.estimatedMarketValue,
            ltvPct:            MAX_LTV,
            builderName:       input.builderName,
            constructionStage: input.constructionStage,
        });

        // Transition loan → PROPERTY_ASSESSMENT
        await loansRepository.updateApplicationStatus(
            input.loanId,
            LOAN_STATUS.PROPERTY_ASSESSMENT,
        );

        log.info('Property assessment submitted', {
            loanId:      input.loanId,
            marketValue: input.estimatedMarketValue,
            maxLoan,
            assessedBy:  input.assessedBy,
        });

        return {
            applicationId:          input.loanId,
            estimatedValue:         input.estimatedMarketValue,
            maxLtv:                 MAX_LTV,
            maxLoanBasedOnProperty: maxLoan,
            legalStatus:            input.legalClearance ? 'CLEAR' : 'PENDING',
            technicalStatus:        input.propertyAge <= 30 ? 'APPROVED' : 'REVIEW',
            collateralId:           collateral.id,
            note:                   `Max loan based on property value: ₹${maxLoan.toLocaleString('en-IN')}. Application moved to credit review.`,
        };
    },

    // ── POST /housing-loans/applications/:id/submit-review ───────────────────
    // Transitions loan → PENDING_APPROVAL

    async submitForReview(applicationId: string): Promise<{ success: boolean; message: string }> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        if (application.status !== LOAN_STATUS.PROPERTY_ASSESSMENT) {
            throw new LoanStateError(
                applicationId,
                application.status,
                LOAN_STATUS.PENDING_APPROVAL,
            );
        }

        await loansRepository.updateApplicationStatus(
            applicationId,
            LOAN_STATUS.PENDING_APPROVAL,
        );

        log.info('Housing loan submitted for credit review', { applicationId });

        return {
            success: true,
            message: 'Application submitted for credit committee review.',
        };
    },

    // ── GET /housing-loans/applications/:id/decision ──────────────────────────
    // Reads from loan_applications — credit manager uses main loans approval flow

    async getCommitteeDecision(applicationId: string): Promise<HousingDecision> {
        const application = await loansRepository.findApplicationByIdOrThrow(applicationId);

        if (application.status === LOAN_STATUS.APPROVED && application.approvedAmount) {
            return {
                applicationId,
                decision:        'APPROVED',
                approvedAmount:  application.approvedAmount,
                interestRate:    application.interestRate,
                tenureMonths:    application.tenureMonths,
                monthlyEmi:      application.approvedAmount && application.interestRate
                    ? calcEmi(application.approvedAmount, application.interestRate, application.tenureMonths)
                    : null,
                rejectionReason: null,
                conditions:      ['Title deed to be submitted before disbursement', 'Insurance mandatory'],
                note:            'Loan approved by credit committee.',
            };
        }

        if (application.status === LOAN_STATUS.REJECTED) {
            return {
                applicationId,
                decision:        'REJECTED',
                approvedAmount:  null,
                interestRate:    null,
                tenureMonths:    null,
                monthlyEmi:      null,
                rejectionReason: application.rejectionReason,
                conditions:      [],
                note:            'Loan rejected by credit committee.',
            };
        }

        return {
            applicationId,
            decision:        'PENDING',
            approvedAmount:  null,
            interestRate:    null,
            tenureMonths:    null,
            monthlyEmi:      null,
            rejectionReason: null,
            conditions:      [],
            note:            'Credit committee review in progress.',
        };
    },

    // ── Downstream stubs — pending vendor wiring ──────────────────────────────

    generateAgreement(applicationId: string): HousingAgreementResult {
        return {
            applicationId,
            agreementId:     `agr_ahl_${Date.now()}`,
            agreementUrl:    `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/ahl_${applicationId}.pdf`,
            status:          'GENERATED',
            eSignRequestId:  null,
            stampDutyAmount: 500,
            note:            'Agreement generated. Please review and sign.',
        };
    },

    eSign(applicationId: string): HousingAgreementResult {
        return {
            applicationId,
            agreementId:     `agr_ahl_${applicationId}`,
            agreementUrl:    `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/agreements/ahl_${applicationId}_signed.pdf`,
            status:          'SIGNED',
            eSignRequestId:  `esign_${Date.now()}`,
            stampDutyAmount: 500,
            note:            'Agreement signed and stored successfully.',
        };
    },

    registerNach(applicationId: string, _input: HousingNachInput): HousingNachResult {
        return {
            applicationId,
            mandateId:         `mandate_ahl_${Date.now()}`,
            mandateType:       'E_NACH',
            bankAccount:       'XXXX1234',
            maxAmount:         100000,
            status:            'PENDING_REGISTRATION',
            razorpayMandateId: null,
            note:              'NACH mandate registration initiated.',
        };
    },

    applyPmaySubsidy(
        applicationId: string,
        input: HousingPmaySubsidyInput,
    ): HousingPmaySubsidyResult {
        const subsidyRates:   Record<string, number> = { EWS: 6.5, LIG: 6.5, MIG_I: 4.0, MIG_II: 3.0 };
        const subsidyAmounts: Record<string, number> = { EWS: 267280, LIG: 267280, MIG_I: 235068, MIG_II: 230156 };
        const eligible = input.isFirstTimeOwner && input.annualIncome <= 1800000;

        return {
            applicationId,
            eligible,
            category:      input.category,
            subsidyAmount: eligible ? (subsidyAmounts[input.category] ?? 0) : 0,
            subsidyRate:   subsidyRates[input.category] ?? 0,
            netLoanAmount: 2500000 - (eligible ? (subsidyAmounts[input.category] ?? 0) : 0),
            note:          eligible
                ? `PMAY subsidy applicable under ${input.category} category.`
                : 'Not eligible for PMAY subsidy.',
        };
    },

    disburseToBuilder(
        applicationId: string,
        input: HousingDisbursalInput,
    ): HousingDisbursalResult {
        log.info('Disbursing housing loan to builder', { applicationId, amount: input.amount });
        return {
            applicationId,
            disbursalId: `disb_ahl_${Date.now()}`,
            amount:      input.amount,
            mode:        input.disbursalMode,
            status:      'COMPLETED',
            utrNumber:   `UTR${Date.now()}`,
            disbursedAt: new Date().toISOString(),
            note:        'Loan disbursed to builder successfully.',
        };
    },

    getEmiSchedule(loanId: string) {
        const emi = calcEmi(2500000, HOUSING_INTEREST_RATE, 180);
        return Array.from({ length: 6 }, (_, i) => ({
            emiNumber: i + 1,
            dueDate:   new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0] ?? '',
            amount:    emi,
            principal: Math.round(emi * 0.4),
            interest:  Math.round(emi * 0.6),
            status:    i === 0 ? 'PAID' : 'PENDING',
        }));
    },

    // Real: outstanding principal and new EMI now derive from the actual
    // loan account and real EMI math — the old version used a hardcoded
    // ₹24,00,000 principal for every single loan, regardless of what the
    // customer actually borrowed.
    async getPrepaymentQuote(loanId: string, prepaymentAmount: number): Promise<HousingPrepaymentQuote> {
        const account = await loansRepository.findAccountByIdOrThrow(loanId);
        const summary = await emiService.getSummary(loanId);

        if (prepaymentAmount <= 0 || prepaymentAmount > summary.totalOutstanding) {
            throw new ValidationError('prepaymentAmount', 'Prepayment amount must be positive and not exceed outstanding principal');
        }

        const remainingPrincipal = summary.totalOutstanding - prepaymentAmount;
        const remainingMonths = Math.max(
            1,
            account.tenureMonths - Math.round((account.tenureMonths * summary.paidEmis) / summary.totalEmis),
        );
        const newEmi = remainingPrincipal > 0
            ? Math.round((remainingPrincipal * (account.interestRate / 1200)) /
                (1 - Math.pow(1 + account.interestRate / 1200, -remainingMonths)))
            : 0;

        return {
            loanId,
            principalOutstanding: summary.totalOutstanding,
            prepaymentAmount,
            prepaymentCharges: 0, // No prepayment penalty on floating-rate housing loans per RBI direction
            totalPayable: prepaymentAmount,
            newTenureMonths: remainingMonths,
            newEmi,
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        };
    },

    // Real: records the actual prepayment against the loan account and
    // recalculates outstanding balance from real data.
    async processPrepayment(loanId: string, input: { amount: number }): Promise<HousingPrepaymentResult> {
        const quote = await this.getPrepaymentQuote(loanId, input.amount);

        await prisma.loan_accounts.update({
            where: { id: loanId },
            data: {
                outstanding_balance: quote.principalOutstanding - input.amount,
                updated_at: new Date(),
            },
        });

        log.info('Housing loan prepayment processed', { loanId, amount: input.amount });

        return {
            loanId,
            prepaymentId: `prep_${Date.now()}`,
            amountPaid: input.amount,
            newOutstanding: quote.principalOutstanding - input.amount,
            newEmi: quote.newEmi,
            newTenure: quote.newTenureMonths,
            status: 'COMPLETED',
            note: 'Prepayment processed successfully.',
        };
    },

    // Real: reads actual overdue EMI data — the old version always
    // reported zero overdue, for every loan, permanently.
    async getOverdueStatus(loanId: string): Promise<HousingOverdueStatus> {
        const summary = await emiService.getSummary(loanId);

        const overdueAgg = await prisma.emi_schedule.aggregate({
            where: { loan_account_id: loanId, status: 'OVERDUE' },
            _sum: { emi_amount: true },
        });
        const overdueAmount = Number(overdueAgg._sum.emi_amount ?? 0);

        const status: HousingOverdueStatus['status'] =
            summary.overdueEmis === 0 ? 'CURRENT' : summary.overdueEmis <= 3 ? 'OVERDUE' : 'NPA';

        return {
            loanId,
            overdueAmount,
            overdueDays: summary.nextDueDate
                ? Math.max(0, Math.floor((Date.now() - summary.nextDueDate.getTime()) / (1000 * 60 * 60 * 24)))
                : 0,
            overdueEmis: summary.overdueEmis,
            penaltyCharges: summary.totalPenalty,
            totalDue: overdueAmount + summary.totalPenalty,
            status,
            note: status === 'CURRENT' ? 'No overdue amount.' : `${summary.overdueEmis} EMI(s) overdue.`,
        };
    },

    closeLoan(loanId: string): HousingClosureResult {
        return {
            loanId,
            closureId:       `closure_${Date.now()}`,
            totalAmountPaid: 2500000,
            closedAt:        new Date().toISOString(),
            nocAvailable:    true,
            note:            'Loan closed. NOC will be available within 7 working days.',
        };
    },

    generateNoc(loanId: string): { nocRef: string; nocS3Url: string } {
        return {
            nocRef:   `NOC-AHL-${loanId}-${Date.now()}`,
            nocS3Url: `https://feuhrer-docs.s3.ap-south-1.amazonaws.com/noc/ahl_${loanId}.pdf`,
        };
    },

    activateLoan(userId: string, input: Record<string, unknown>) {
        return {
            loanId:      `ahl_loan_${Date.now()}`,
            status:      'ACTIVE',
            activatedAt: new Date().toISOString(),
            ...input,
        };
    },
};
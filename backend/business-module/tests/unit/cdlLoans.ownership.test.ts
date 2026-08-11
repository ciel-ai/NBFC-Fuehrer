// tests/unit/cdlLoans.ownership.test.ts
//
// Regression coverage for CDL audit findings #1/#2/#6 (self-approval +
// missing ownership checks). Before this fix, no CDL customer-facing
// service method checked that the caller owned the application/account it
// was acting on — any authenticated customer could act on any other
// customer's CDL application or loan by ID alone. Every method below now
// calls assertApplicationOwnership/assertAccountOwnership immediately
// after its existing OrThrow lookup.
//
// For each method: a caller who doesn't own the resource gets
// ForbiddenError, and a staff-role caller bypasses the check regardless
// of ownership (per isStaffRole()).

const mockFindApplicationByIdOrThrow = jest.fn();
const mockFindAccountByIdOrThrow = jest.fn();
const mockUpdateApplicationStatus = jest.fn();
const mockUpdateAccountStatus = jest.fn();

jest.mock('@/modules/loans/loans.repository', () => ({
    loansRepository: {
        findApplicationByIdOrThrow: (...args: unknown[]) => mockFindApplicationByIdOrThrow(...args),
        findAccountByIdOrThrow: (...args: unknown[]) => mockFindAccountByIdOrThrow(...args),
        updateApplicationStatus: (...args: unknown[]) => mockUpdateApplicationStatus(...args),
        updateAccountStatus: (...args: unknown[]) => mockUpdateAccountStatus(...args),
    },
}));

const mockLoanApplicationsFindUnique = jest.fn();
const mockLoanApplicationsFindUniqueOrThrow = jest.fn();
const mockLoanApplicationsUpdate = jest.fn();
const mockKycDocumentsFindUnique = jest.fn();
const mockCustomersFindUnique = jest.fn();
const mockEmiScheduleAggregate = jest.fn();

jest.mock('@/config/database', () => ({
    prisma: {
        loan_applications: {
            findUnique: (...args: unknown[]) => mockLoanApplicationsFindUnique(...args),
            findUniqueOrThrow: (...args: unknown[]) => mockLoanApplicationsFindUniqueOrThrow(...args),
            update: (...args: unknown[]) => mockLoanApplicationsUpdate(...args),
        },
        kyc_documents: {
            findUnique: (...args: unknown[]) => mockKycDocumentsFindUnique(...args),
        },
        customers: {
            findUnique: (...args: unknown[]) => mockCustomersFindUnique(...args),
        },
        emi_schedule: {
            aggregate: (...args: unknown[]) => mockEmiScheduleAggregate(...args),
        },
    },
}));

const mockKycFindByUserId = jest.fn();
jest.mock('@/modules/kyc', () => ({
    kycRepository: { findByUserId: (...args: unknown[]) => mockKycFindByUserId(...args) },
}));

const mockGetSchedule = jest.fn();
const mockGetSummary = jest.fn();
const mockGetForeclosureQuote = jest.fn();
const mockApplyBounce = jest.fn();
jest.mock('@/modules/emi', () => ({
    emiService: {
        getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
        getSummary: (...args: unknown[]) => mockGetSummary(...args),
        getForeclosureQuote: (...args: unknown[]) => mockGetForeclosureQuote(...args),
        applyBounce: (...args: unknown[]) => mockApplyBounce(...args),
    },
}));

const mockRecordCashPayment = jest.fn();
const mockCreateMandateForApplication = jest.fn();
jest.mock('@/modules/payments', () => ({
    paymentsService: {
        recordCashPayment: (...args: unknown[]) => mockRecordCashPayment(...args),
        createMandateForApplication: (...args: unknown[]) => mockCreateMandateForApplication(...args),
    },
}));

const mockGeneratePdfAgreement = jest.fn();
const mockGeneratePdfNoc = jest.fn();
jest.mock('@/modules/documents/pdf.service', () => ({
    pdfService: {
        generateCdlLoanAgreement: (...args: unknown[]) => mockGeneratePdfAgreement(...args),
        generateNoc: (...args: unknown[]) => mockGeneratePdfNoc(...args),
    },
}));

const mockUpload = jest.fn();
const mockGetSignedUrl = jest.fn();
jest.mock('@/providers/docStorage', () => ({
    getDocStorageProvider: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
    }),
}));

const mockDecrypt = jest.fn();
jest.mock('@/providers/encryption', () => ({
    getEncryptionProvider: () => ({ decrypt: (...args: unknown[]) => mockDecrypt(...args) }),
}));

const mockCreateSignRequest = jest.fn();
const mockGetSignStatus = jest.fn();
const mockApplyEStamp = jest.fn();
const mockGetSignedDocument = jest.fn();
jest.mock('@/providers/esign', () => ({
    getESignProvider: () => ({
        createSignRequest: (...args: unknown[]) => mockCreateSignRequest(...args),
        getSignStatus: (...args: unknown[]) => mockGetSignStatus(...args),
        applyEStamp: (...args: unknown[]) => mockApplyEStamp(...args),
        getSignedDocument: (...args: unknown[]) => mockGetSignedDocument(...args),
    }),
}));

import { cdlLoansService } from '@/modules/cdlLoans/cdlLoans.service';
import { ForbiddenError, LoanStateError } from '@/errors';
import { ROLE } from '@/config/constants';

const APPLICATION_ID = 'app-1';
const LOAN_ID = 'loan-1';
const OWNER_ID = 'user-1';
const OTHER_ID = 'user-2';
const STAFF_ROLE = ROLE.SUPER_ADMIN;

const ownedApplication = { id: APPLICATION_ID, userId: OWNER_ID, interestRate: 13, tenureMonths: 12, amountRequested: 25000, processingFee: 1463 };
const ownedApplicationRaw = { id: APPLICATION_ID, user_id: OWNER_ID, status: 'APPROVED', approved_amount: 25000, amount_requested: 25000, tenure_months: 12, esign_request_id: 'req-1', user: { full_name: 'X', phone: '+911234567890' } };
const ownedAccount = { id: LOAN_ID, userId: OWNER_ID, status: 'ACTIVE', interestRate: 13 };

beforeEach(() => {
    jest.clearAllMocks();
    mockLoanApplicationsUpdate.mockResolvedValue({});
    mockUpdateApplicationStatus.mockResolvedValue({});
    mockUpdateAccountStatus.mockResolvedValue({});
    mockUpload.mockResolvedValue({ key: 'k', eTag: 'e' });
    mockGetSignedUrl.mockResolvedValue({ url: 'https://stub/doc.pdf', expiresAt: new Date() });
});

describe('CDL ownership checks — application-scoped methods', () => {
    test('runKycChecks: rejects a caller who does not own the application', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        await expect(
            cdlLoansService.runKycChecks(APPLICATION_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('runKycChecks: staff bypasses ownership', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        mockKycDocumentsFindUnique.mockResolvedValue(null);
        await expect(
            cdlLoansService.runKycChecks(APPLICATION_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('runComplianceChecks: rejects a caller who does not own the application', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        await expect(
            cdlLoansService.runComplianceChecks(APPLICATION_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('runComplianceChecks: staff bypasses ownership', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        mockKycDocumentsFindUnique.mockResolvedValue(null);
        await expect(
            cdlLoansService.runComplianceChecks(APPLICATION_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    const assessmentInput = { monthlyIncome: 60000, existingEmis: 5000, proposedEmi: 2233 };

    test('runCreditAssessment: rejects a caller who does not own the application', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        await expect(
            cdlLoansService.runCreditAssessment(APPLICATION_ID, assessmentInput, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('runCreditAssessment: staff bypasses ownership', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        mockKycFindByUserId.mockResolvedValue({ creditScore: 780 });
        await expect(
            cdlLoansService.runCreditAssessment(APPLICATION_ID, assessmentInput, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('getCreditDecision: rejects a caller who does not own the application', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        await expect(
            cdlLoansService.getCreditDecision(APPLICATION_ID, assessmentInput, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('getCreditDecision: staff bypasses ownership', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        mockKycFindByUserId.mockResolvedValue({ creditScore: 780 });
        await expect(
            cdlLoansService.getCreditDecision(APPLICATION_ID, assessmentInput, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('generateAgreement: rejects a caller who does not own the application', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        await expect(
            cdlLoansService.generateAgreement(APPLICATION_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('generateAgreement: staff bypasses ownership', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        mockKycDocumentsFindUnique.mockResolvedValue({ aadhaar_encrypted: 'ciphertext' });
        mockGeneratePdfAgreement.mockResolvedValue(Buffer.from('pdf'));
        mockDecrypt.mockResolvedValue('999912345678');
        mockCreateSignRequest.mockResolvedValue({ requestId: 'req-1', signingUrl: 'https://stub/sign', status: 'PENDING' });
        await expect(
            cdlLoansService.generateAgreement(APPLICATION_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('completeESign: rejects a caller who does not own the application', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        await expect(
            cdlLoansService.completeESign(APPLICATION_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('completeESign: staff bypasses ownership', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        mockGetSignStatus.mockResolvedValue({ status: 'SIGNED' });
        mockCustomersFindUnique.mockResolvedValue({ state: 'Karnataka' });
        mockApplyEStamp.mockResolvedValue({ stampId: 'stamp-1', status: 'APPLIED', stampDutyRupees: 25 });
        mockGetSignedDocument.mockResolvedValue({ documentBase64: Buffer.from('signed').toString('base64') });
        await expect(
            cdlLoansService.completeESign(APPLICATION_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('registerNachMandate: rejects a caller who does not own the application', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, { bankAccount: '123456789012', ifsc: 'HDFC0001234' }, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('registerNachMandate: staff bypasses ownership', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue(ownedApplicationRaw);
        mockCreateMandateForApplication.mockResolvedValue({ id: 'mandate-1', bankAccount: '123456789012', razorpayMandateId: 'rzp-1' });
        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, { bankAccount: '123456789012', ifsc: 'HDFC0001234' }, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });
});

// Regression test for CDL audit finding #13: registerNachMandate never
// checked application.status — a real Razorpay mandate could be
// registered against a DRAFT or REJECTED application, one that was never
// approved.
describe('registerNachMandate — application-status guard (audit finding #13)', () => {
    const MANDATE_INPUT = { bankAccount: '123456789012', ifsc: 'HDFC0001234' };

    test('throws LoanStateError when the application is DRAFT', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ ...ownedApplicationRaw, status: 'DRAFT' });

        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, MANDATE_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(LoanStateError);
        expect(mockCreateMandateForApplication).not.toHaveBeenCalled();
    });

    test('throws LoanStateError when the application is REJECTED', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ ...ownedApplicationRaw, status: 'REJECTED' });

        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, MANDATE_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(LoanStateError);
        expect(mockCreateMandateForApplication).not.toHaveBeenCalled();
    });

    test('succeeds when the application is APPROVED — regression, the existing happy path still works', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ ...ownedApplicationRaw, status: 'APPROVED' });
        mockCreateMandateForApplication.mockResolvedValue({ id: 'mandate-1', bankAccount: '123456789012', razorpayMandateId: 'rzp-1' });

        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, MANDATE_INPUT, OWNER_ID, ROLE.CUSTOMER),
        ).resolves.toBeDefined();
        expect(mockCreateMandateForApplication).toHaveBeenCalledTimes(1);
    });

    test('ownership is checked BEFORE status — a non-owner gets ForbiddenError, not a LoanStateError that would reveal the application\'s status to them', async () => {
        mockLoanApplicationsFindUniqueOrThrow.mockResolvedValue({ ...ownedApplicationRaw, status: 'DRAFT' });

        await expect(
            cdlLoansService.registerNachMandate(APPLICATION_ID, MANDATE_INPUT, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
        expect(mockCreateMandateForApplication).not.toHaveBeenCalled();
    });
});

describe('CDL ownership checks — account-scoped methods', () => {
    test('getEmiSchedule: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.getEmiSchedule(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('getEmiSchedule: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGetSchedule.mockResolvedValue([]);
        await expect(
            cdlLoansService.getEmiSchedule(LOAN_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('processManualPayment: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.processManualPayment(LOAN_ID, 'emi-1', 2233, OTHER_ID, undefined, {}, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('processManualPayment: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockRecordCashPayment.mockResolvedValue({
            id: 'pay-1', amount: 2233, penaltyAmount: 0, totalCollected: 2233,
            status: 'SUCCESS', settledAt: new Date(), initiatedAt: new Date(),
        });
        await expect(
            cdlLoansService.processManualPayment(LOAN_ID, 'emi-1', 2233, OTHER_ID, undefined, {}, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('handlePaymentFailure: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.handlePaymentFailure(LOAN_ID, 'emi-1', {}, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('handlePaymentFailure: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockApplyBounce.mockResolvedValue({ status: 'BOUNCED', nextRetryAt: new Date() });
        await expect(
            cdlLoansService.handlePaymentFailure(LOAN_ID, 'emi-1', {}, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('getOverdueStatus: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.getOverdueStatus(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('getOverdueStatus: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGetSummary.mockResolvedValue({});
        mockEmiScheduleAggregate.mockResolvedValue({ _sum: { emi_amount: 0, penalty_amount: 0 }, _min: { due_date: null } });
        await expect(
            cdlLoansService.getOverdueStatus(LOAN_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('closeLoan: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        await expect(
            cdlLoansService.closeLoan(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('closeLoan: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGetSummary.mockResolvedValue({ totalOutstanding: 0 });
        mockGetForeclosureQuote.mockResolvedValue({ total: 0 });
        await expect(
            cdlLoansService.closeLoan(LOAN_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });

    test('generateNoc: rejects a caller who does not own the account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ ...ownedAccount, status: 'CLOSED' });
        await expect(
            cdlLoansService.generateNoc(LOAN_ID, OTHER_ID, ROLE.CUSTOMER),
        ).rejects.toThrow(ForbiddenError);
    });

    test('generateNoc: staff bypasses ownership', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue({ ...ownedAccount, status: 'CLOSED' });
        mockGeneratePdfNoc.mockResolvedValue(Buffer.from('pdf'));
        await expect(
            cdlLoansService.generateNoc(LOAN_ID, OTHER_ID, STAFF_ROLE),
        ).resolves.toBeDefined();
    });
});

describe('CDL ownership checks — legitimate owner succeeds (not just staff)', () => {
    test('getEmiSchedule: the actual owner can access their own account', async () => {
        mockFindAccountByIdOrThrow.mockResolvedValue(ownedAccount);
        mockGetSchedule.mockResolvedValue([]);
        await expect(
            cdlLoansService.getEmiSchedule(LOAN_ID, OWNER_ID, ROLE.CUSTOMER),
        ).resolves.toBeDefined();
    });

    test('runKycChecks: the actual owner can access their own application', async () => {
        mockFindApplicationByIdOrThrow.mockResolvedValue(ownedApplication);
        mockKycDocumentsFindUnique.mockResolvedValue(null);
        await expect(
            cdlLoansService.runKycChecks(APPLICATION_ID, OWNER_ID, ROLE.CUSTOMER),
        ).resolves.toBeDefined();
    });
});

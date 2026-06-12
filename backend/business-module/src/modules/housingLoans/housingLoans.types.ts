// src/modules/housingLoans/housingLoans.types.ts

export interface HousingApplicationInput {
    propertyType: 'SELF_CONSTRUCTION' | 'HOME_IMPROVEMENT' | 'PLOT_PURCHASE' | 'READY_PROPERTY';
    loanAmount: number;
    tenureMonths: number;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyPincode: string;
    employmentType: 'SALARIED' | 'SELF_EMPLOYED' | 'INFORMAL';
    monthlyIncome: number;
    coApplicantName?: string;
    coApplicantPhone?: string;
}

export interface HousingApplicationResult {
    applicationId: string;
    status: string;
    loanAmount: number;
    tenureMonths: number;
    interestRate: number;
    monthlyEmi: number;
    processingFee: number;
    referenceId: string;
    createdAt: string;
    note: string;
}

export interface HousingApplicant {
    name: string;
    phone: string;
    pan: string;
    aadhaar: string;
    dob: string;
    address: string;
}

export interface HousingKycResult {
    applicationId: string;
    kycStatus: 'PASSED' | 'FAILED' | 'PENDING';
    aadhaarVerified: boolean;
    panVerified: boolean;
    faceMatchScore: number;
    note: string;
}

export interface HousingComplianceResult {
    applicationId: string;
    amlStatus: string;
    pepStatus: string;
    overallStatus: 'PASSED' | 'FAILED' | 'REVIEW';
    flags: string[];
    note: string;
}

export interface HousingIncomeAssessmentInput {
    monthlyIncome: number;
    employmentType: string;
    bankStatementMonths: number;
    averageMonthlyCredit: number;
    existingEmis: number;
}

export interface HousingIncomeAssessment {
    applicationId: string;
    monthlyIncome: number;
    existingEmis: number;
    proposedEmi: number;
    foir: number;
    foirStatus: 'PASS' | 'FAIL';
    maxEligibleAmount: number;
    note: string;
}

export interface HousingCreditAssessmentInput {
    cibilScore: number;
    existingLoans: number;
    overdueAccounts: number;
}

export interface HousingCreditAssessment {
    applicationId: string;
    cibilScore: number;
    creditStatus: 'PASS' | 'FAIL' | 'REVIEW';
    maxLoanAmount: number;
    recommendedInterestRate: number;
    note: string;
}

export interface HousingPropertyAssessmentInput {
    estimatedMarketValue: number;
    propertyAge: number;
    propertyType: string;
    legalClearance: boolean;
}

export interface HousingPropertyAssessment {
    applicationId: string;
    estimatedValue: number;
    maxLtv: number;
    maxLoanBasedOnProperty: number;
    legalStatus: string;
    technicalStatus: string;
    note: string;
}

export interface HousingDecision {
    applicationId: string;
    decision: 'APPROVED' | 'REJECTED' | 'PENDING';
    approvedAmount: number | null;
    interestRate: number | null;
    tenureMonths: number | null;
    monthlyEmi: number | null;
    rejectionReason: string | null;
    conditions: string[];
    note: string;
}

export interface HousingAgreementResult {
    applicationId: string;
    agreementId: string;
    agreementUrl: string;
    status: 'GENERATED' | 'SIGNED' | 'PENDING';
    eSignRequestId: string | null;
    stampDutyAmount: number;
    note: string;
}

export interface HousingNachInput {
    bankAccount: string;
    ifsc: string;
    accountHolder: string;
}

export interface HousingNachResult {
    applicationId: string;
    mandateId: string;
    mandateType: string;
    bankAccount: string;
    maxAmount: number;
    status: string;
    razorpayMandateId: string | null;
    note: string;
}

export interface HousingPmaySubsidyInput {
    category: 'EWS' | 'LIG' | 'MIG_I' | 'MIG_II';
    annualIncome: number;
    isFirstTimeOwner: boolean;
}

export interface HousingPmaySubsidyResult {
    applicationId: string;
    eligible: boolean;
    category: string;
    subsidyAmount: number;
    subsidyRate: number;
    netLoanAmount: number;
    note: string;
}

export interface HousingDisbursalInput {
    disbursalMode: 'UPI' | 'NEFT' | 'IMPS' | 'RTGS';
    beneficiaryName: string;
    beneficiaryAccount: string;
    beneficiaryIfsc: string;
    amount: number;
}

export interface HousingDisbursalResult {
    applicationId: string;
    disbursalId: string;
    amount: number;
    mode: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    utrNumber: string | null;
    disbursedAt: string | null;
    note: string;
}

export interface HousingOverdueStatus {
    loanId: string;
    overdueAmount: number;
    overdueDays: number;
    overdueEmis: number;
    penaltyCharges: number;
    totalDue: number;
    status: 'CURRENT' | 'OVERDUE' | 'NPA';
    note: string;
}

export interface HousingPrepaymentQuote {
    loanId: string;
    principalOutstanding: number;
    prepaymentAmount: number;
    prepaymentCharges: number;
    totalPayable: number;
    newTenureMonths: number;
    newEmi: number;
    validUntil: string;
}

export interface HousingPrepaymentResult {
    loanId: string;
    prepaymentId: string;
    amountPaid: number;
    newOutstanding: number;
    newEmi: number;
    newTenure: number;
    status: string;
    note: string;
}

export interface HousingClosureResult {
    loanId: string;
    closureId: string;
    totalAmountPaid: number;
    closedAt: string;
    nocAvailable: boolean;
    note: string;
}
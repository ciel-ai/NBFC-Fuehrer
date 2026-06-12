// src/modules/goldLoans/goldLoans.types.ts

export interface GoldRate {
    ratePerGram: number;
    purityRates: {
        '18K': number;
        '20K': number;
        '22K': number;
        '24K': number;
    };
    maxLtvPercent: number;
    currency: string;
    updatedAt: string;
    source: string;
    note: string;
}

export interface GoldEligibilityRequest {
    goldType: 'JEWELLERY' | 'COIN_BAR';
    purityKarat: '18' | '20' | '22' | '24';
    weightGrams: number;
    requestedAmount?: number;
    tenureMonths?: number;
    repaymentMode?: 'EMI' | 'INTEREST_ONLY' | 'BULLET';
}

export interface GoldEligibility {
    eligible: boolean;
    estimatedGoldValue: number;
    maxLoanAmount: number;
    requestedAmount: number;
    approvedAmount: number;
    interestRate: number;
    tenureMonths: number;
    repaymentMode: string;
    monthlyEmi: number | null;
    monthlyInterest: number | null;
    processingFee: number;
    ltv: number;
    currency: string;
    note: string;
}

export interface GoldLoanBranch {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    lat: number;
    lng: number;
    distanceKm: number;
    availableSlots: string[];
    workingHours: string;
}

export interface GoldLoanAppointmentRequest {
    applicationId: string;
    branchId: string;
    preferredDate: string;
    preferredSlot: string;
    customerName: string;
    customerPhone: string;
}

export interface GoldLoanAppointment {
    appointmentId: string;
    applicationId: string;
    branchId: string;
    branchName: string;
    branchAddress: string;
    confirmedDate: string;
    confirmedSlot: string;
    referenceId: string;
    status: string;
    note: string;
}

export interface GoldLoanAppraisalResult {
    applicationId: string;
    appraisedGoldValue: number;
    actualWeightGrams: number;
    actualPurityKarat: string;
    finalLoanAmount: number;
    ltv: number;
    appraisedBy: string;
    appraisedAt: string;
    status: 'PENDING' | 'COMPLETED' | 'REJECTED';
    note: string;
}

export interface GoldLoanAgreementResult {
    applicationId: string;
    agreementId: string;
    agreementUrl: string;
    status: 'GENERATED' | 'SIGNED' | 'PENDING';
    eSignRequestId: string | null;
    stampDutyAmount: number;
    note: string;
}

export interface GoldLoanNachResult {
    applicationId: string;
    mandateId: string;
    mandateType: string;
    bankAccount: string;
    maxAmount: number;
    frequency: string;
    status: string;
    razorpayMandateId: string | null;
    note: string;
}

export interface GoldLoanDisbursalStatus {
    applicationId: string;
    disbursalId: string;
    amount: number;
    mode: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    utrNumber: string | null;
    disbursedAt: string | null;
    bankAccount: string;
    note: string;
}

export interface GoldLoanMonitoring {
    loanId: string;
    currentGoldValue: number;
    currentLtv: number;
    maxLtv: number;
    ltvBreached: boolean;
    outstandingAmount: number;
    overdueAmount: number;
    nextEmiDate: string | null;
    nextEmiAmount: number | null;
    goldStorageStatus: string;
    auctionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    note: string;
}

export interface GoldLoanClosureQuote {
    loanId: string;
    principalOutstanding: number;
    interestOutstanding: number;
    penaltyCharges: number;
    processingFee: number;
    totalClosureAmount: number;
    validUntil: string;
    goldReleaseNote: string;
}

export interface GoldLoanComplianceResult {
    applicationId: string;
    kycStatus: string;
    amlStatus: string;
    pepStatus: string;
    overallStatus: 'PASSED' | 'FAILED' | 'REVIEW';
    flags: string[];
    note: string;
}
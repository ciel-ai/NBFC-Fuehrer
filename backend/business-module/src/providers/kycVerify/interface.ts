// src/providers/kycVerify/interface.ts

export interface AadhaarVerifyResult {
    verified: boolean;
    nameOnAadhaar: string | null;
    dob: string | null;
    address: string | null;
    shareCode: string | null;
    rawResponse: unknown;
}

export interface PanVerifyResult {
    verified: boolean;
    nameOnPan: string | null;
    status: string;
    rawResponse: unknown;
}

export interface FaceMatchResult {
    matched: boolean;
    confidence: number; // 0â€“100
    rawResponse: unknown;
}

export interface LivenessResult {
    passed: boolean;
    score: number; // 0â€“100
    rawResponse: unknown;
}

export interface OcrResult {
    extractedData: Record<string, unknown>;
    rawResponse: unknown;
}

export interface BankAccountVerifyResult {
    valid: boolean;
    nameAtBank: string | null;
    rawResponse: unknown;
}

export interface AmlResult {
    flagged: boolean;
    matches: unknown[];
    rawResponse: unknown;
}

export interface GstVerifyResult {
    valid: boolean;
    businessName: string | null;
    status: string;
    rawResponse: unknown;
}

export interface ItrResult {
    verified: boolean;
    income: number | null;
    taxPaid: number | null;
    rawResponse: unknown;
}

export interface BankStatementResult {
    analysed: boolean;
    averageMonthlyBalance: number | null;
    monthlyCredits: number | null;
    monthlyDebits: number | null;
    rawResponse: unknown;
}

export interface PepResult {
    isPep: boolean;
    matches: unknown[];
    rawResponse: unknown;
}

export interface BankDefaulterResult {
    isDefaulter: boolean;
    records: unknown[];
    rawResponse: unknown;
}

export interface EmploymentVerifyResult {
    verified: boolean;
    employerName: string | null;
    employmentType: string | null;
    rawResponse: unknown;
}

export interface NameSimilarityResult {
    similar: boolean;
    score: number; // 0â€“100
    rawResponse: unknown;
}

export interface IKycVerifyProvider {
    // Aadhaar
    requestAadhaarConsent(aadhaarNumber: string, customerName: string): Promise<{ requestId: string | null; rawResponse: unknown }>;
    verifyAadhaar(aadhaarNumber: string, accessKey: string, shareCode: string): Promise<AadhaarVerifyResult>;
    verifyAadhaarMobileLink(aadhaarNumber: string, mobileNumber: string): Promise<{ linked: boolean; rawResponse: unknown }>;

    // PAN
    verifyPAN(panNumber: string, fullName: string, dob: string): Promise<PanVerifyResult>;
    verifyPANAdvanced(panNumber: string): Promise<PanVerifyResult>;
    verifyPANAadhaarLinkStatus(panNumber: string): Promise<{ linked: boolean; status: string; rawResponse: unknown }>;

    // Face & Liveness
    matchFace(selfieBase64: string, idPhotoBase64: string): Promise<FaceMatchResult>;
    checkLiveness(imageBase64: string): Promise<LivenessResult>;

    // Name
    checkNameSimilarity(name1: string, name2: string): Promise<NameSimilarityResult>;

    // Bank
    verifyBankAccount(accountNumber: string, ifsc: string, accountHolder: string): Promise<BankAccountVerifyResult>;
    verifyBankAccountAdvanced(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult>;
    silentBankVerify(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult>;
    analyzeBankStatement(accountNumber: string, ifsc: string, fromDate: string, toDate: string): Promise<BankStatementResult>;

    // GST
    verifyGST(gstin: string): Promise<GstVerifyResult>;
    extractGSTCertificateOCR(imageBase64: string): Promise<OcrResult>;

    // AML / Risk
    screenAML(fullName: string, dob?: string): Promise<AmlResult>;
    checkPEP(fullName: string): Promise<PepResult>;
    checkAlerts(fullName: string): Promise<{ flagged: boolean; alerts: unknown[]; rawResponse: unknown }>;
    checkBankDefaulters(panNumber: string): Promise<BankDefaulterResult>;

    // Employment
    verifyEmployment(panNumber: string): Promise<EmploymentVerifyResult>;

    // ITR
    verifyITRSalaried(panNumber: string, assessmentYear: string): Promise<ItrResult>;
    verifyITRBusiness(panNumber: string, assessmentYear: string): Promise<ItrResult>;

    // OCR
    extractAadhaarOCR(imageBase64: string): Promise<OcrResult>;
    extractPanOCR(imageBase64: string): Promise<OcrResult>;
}

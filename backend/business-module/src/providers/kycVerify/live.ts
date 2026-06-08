// src/providers/kycVerify/live.ts
import type { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { createHttpClient, vendorCall } from '../_base/provider.utils';
import { KYC_VENDOR_ERRORS } from '@/errors';
import type {
    IKycVerifyProvider,
    AadhaarVerifyResult,
    PanVerifyResult,
    FaceMatchResult,
    LivenessResult,
    OcrResult,
    BankAccountVerifyResult,
    AmlResult,
    GstVerifyResult,
    ItrResult,
    BankStatementResult,
    PepResult,
    BankDefaulterResult,
    EmploymentVerifyResult,
    NameSimilarityResult,
} from './interface';

function perfiosHeaders(secureId: string, secureCred: string, orgId: string) {
    return {
        'x-secure-id': secureId,
        'x-secure-cred': secureCred,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; FuehrerNBFC/1.0)',
    };
}

function isSuccess(statusCode: number): boolean {
    return statusCode === 101;
}

export class PerfiosKycProvider implements IKycVerifyProvider {
    private readonly kycClient: AxiosInstance;
    private readonly gstClient: AxiosInstance;
    private readonly itrClient: AxiosInstance;
    private readonly kscanClient: AxiosInstance;
    private readonly secureId: string;
    private readonly secureCred: string;
    private readonly orgId: string;

    constructor(
        secureId: string,
        secureCred: string,
        orgId: string,
        kycBaseUrl: string,
        gstBaseUrl: string,
        itrBaseUrl: string,
        kscanBaseUrl: string,
        timeoutMs = 30000,
    ) {
        this.secureId = secureId;
        this.secureCred = secureCred;
        this.orgId = orgId;
        const headers = perfiosHeaders(secureId, secureCred, orgId);
        this.kycClient = createHttpClient({ baseURL: kycBaseUrl, timeoutMs, headers, vendor: 'perfios' });
        this.gstClient = createHttpClient({ baseURL: gstBaseUrl, timeoutMs, headers, vendor: 'perfios' });
        this.itrClient = createHttpClient({ baseURL: itrBaseUrl, timeoutMs, headers, vendor: 'perfios' });
        this.kscanClient = createHttpClient({ baseURL: kscanBaseUrl, timeoutMs, headers, vendor: 'perfios' });
    }

    async requestAadhaarConsent(
        aadhaarNumber: string,
        customerName: string,
    ): Promise<{ requestId: string | null; rawResponse: unknown }> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/aadhaar-consent', {
                        aadhaarNo: aadhaarNumber,
                        name: customerName,
                        consent: 'Y',
                        timestamp: new Date().toISOString(),
                        clientData: { caseId: `fhr-${Date.now()}` },
                    });
                    const d = res.data;
                    return {
                        requestId: d.result?.accessKey ?? d.accessKey ?? null,
                        rawResponse: d,
                    };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 2 },
        });
    }

    async verifyAadhaar(
        aadhaarNumber: string,
        accessKey: string,
        _shareCode: string,
    ): Promise<AadhaarVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v2/aadhaar-verification', {
                        aadhaarNo: aadhaarNumber,
                        checkValidation: true,
                        accessKey,
                        consent: 'Y',
                        timestamp: new Date().toISOString(),
                        clientData: { caseId: `fhr-${Date.now()}` },
                    });
                    const d = res.data;
                    return {
                        verified: isSuccess(d.statusCode),
                        nameOnAadhaar: d.data?.name ?? null,
                        dob: d.data?.dob ?? null,
                        address: d.data?.address ?? null,
                        shareCode: null,
                        rawResponse: d,
                    };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 3, delayMs: 1000 },
        });
    }

    async verifyAadhaarMobileLink(
        aadhaarNumber: string,
        mobileNumber: string,
    ): Promise<{ linked: boolean; rawResponse: unknown }> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/aadhaar-mobile-link', {
                        aadhaarNo: aadhaarNumber,
                        mobileNo: mobileNumber,
                        consent: 'Y',
                    });
                    const d = res.data;
                    return { linked: isSuccess(d.statusCode), rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyPAN(panNumber: string, fullName: string, dob: string): Promise<PanVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/pan', { pan: panNumber, name: fullName, dob, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), nameOnPan: d.data?.name ?? null, status: d.data?.status ?? 'UNKNOWN', rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.panVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyPANAdvanced(panNumber: string): Promise<PanVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/pan-advanced', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), nameOnPan: d.data?.name ?? null, status: d.data?.status ?? 'UNKNOWN', rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.panVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyPANAadhaarLinkStatus(panNumber: string): Promise<{ linked: boolean; status: string; rawResponse: unknown }> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/pan-aadhaar-link-status', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { linked: isSuccess(d.statusCode), status: d.data?.linkStatus ?? 'UNKNOWN', rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.panVerifyFailed(err);
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async checkLiveness(imageBase64: string): Promise<LivenessResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/liveness', { img: imageBase64, consent: 'Y' });
                    const d = res.data;
                    return { passed: isSuccess(d.statusCode), score: d.data?.score ?? 0, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.livenessFailed(err);
                }
            },
            retry: { maxAttempts: 2 },
        });
    }

    async matchFace(selfieBase64: string, idPhotoBase64: string): Promise<FaceMatchResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/face-match', { img1: selfieBase64, img2: idPhotoBase64, consent: 'Y' });
                    const d = res.data;
                    return { matched: isSuccess(d.statusCode), confidence: d.data?.similarity ?? 0, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.faceMatchFailed(err);
                }
            },
            retry: { maxAttempts: 2 },
        });
    }

    async checkNameSimilarity(name1: string, name2: string): Promise<NameSimilarityResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/name-similarity', { name1, name2, consent: 'Y' });
                    const d = res.data;
                    return { similar: isSuccess(d.statusCode), score: d.data?.similarityScore ?? 0, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('NAME_SIMILARITY');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyBankAccount(accountNumber: string, ifsc: string, accountHolder: string): Promise<BankAccountVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/bank-account-verification', { accountNumber, ifsc, name: accountHolder, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('BANK_VERIFY');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyBankAccountAdvanced(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/bank-account-verification-advanced', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('BANK_VERIFY_ADVANCED');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async silentBankVerify(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/silent-bank-account-verification', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('SILENT_BANK_VERIFY');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyGST(gstin: string): Promise<GstVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.gstClient.post('v3/gst-authentication', { gstin, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), businessName: d.data?.legalName ?? null, status: d.data?.gstnStatus ?? 'UNKNOWN', rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('GST_VERIFY');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async screenAML(fullName: string, dob?: string): Promise<AmlResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/aml-sanctions-screening', { name: fullName, ...(dob ? { dob } : {}), consent: 'Y' });
                    const d = res.data;
                    return { flagged: !isSuccess(d.statusCode), matches: d.data?.matches ?? [], rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('AML_SCREENING');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async checkPEP(fullName: string): Promise<PepResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/pep-details', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    return { isPep: !isSuccess(d.statusCode) && (d.data?.pepMatches?.length ?? 0) > 0, matches: d.data?.pepMatches ?? [], rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('PEP_CHECK');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async checkAlerts(fullName: string): Promise<{ flagged: boolean; alerts: unknown[]; rawResponse: unknown }> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/alerts', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    return { flagged: (d.data?.alerts?.length ?? 0) > 0, alerts: d.data?.alerts ?? [], rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('ALERTS_CHECK');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async checkBankDefaulters(panNumber: string): Promise<BankDefaulterResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/bank-defaulters', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { isDefaulter: !isSuccess(d.statusCode), records: d.data?.defaulterRecords ?? [], rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('BANK_DEFAULTERS');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyEmployment(panNumber: string): Promise<EmploymentVerifyResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/employment-verification', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), employerName: d.data?.employerName ?? null, employmentType: d.data?.employmentType ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('EMPLOYMENT_VERIFY');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async extractGSTCertificateOCR(imageBase64: string): Promise<OcrResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const buffer = Buffer.from(imageBase64, 'base64');
                    const form = new FormData();
                    form.append('file', buffer, { filename: 'gst_certificate.jpg', contentType: 'image/jpeg' });
                    form.append('consent', 'Y');
                    const res = await this.kscanClient.post('v3/gst-certificate', form, {
                        headers: { ...form.getHeaders(), 'x-secure-id': this.secureId, 'x-secure-cred': this.secureCred, 'x-organization-id': this.orgId },
                    });
                    return { extractedData: res.data.data ?? {}, rawResponse: res.data };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('GST_OCR');
                }
            },
            retry: { maxAttempts: 2 },
        });
    }

    async extractAadhaarOCR(imageBase64: string): Promise<OcrResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const buffer = Buffer.from(imageBase64, 'base64');
                    const form = new FormData();
                    form.append('file', buffer, { filename: 'aadhaar.jpg', contentType: 'image/jpeg' });
                    form.append('consent', 'Y');
                    const res = await this.kscanClient.post('v3/aadhaar', form, {
                        headers: { ...form.getHeaders(), 'x-secure-id': this.secureId, 'x-secure-cred': this.secureCred, 'x-organization-id': this.orgId },
                    });
                    return { extractedData: res.data.data ?? {}, rawResponse: res.data };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('AADHAAR_OCR');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async extractPanOCR(imageBase64: string): Promise<OcrResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const buffer = Buffer.from(imageBase64, 'base64');
                    const form = new FormData();
                    form.append('file', buffer, { filename: 'pan.jpg', contentType: 'image/jpeg' });
                    form.append('consent', 'Y');
                    const res = await this.kscanClient.post('v3/pan', form, {
                        headers: { ...form.getHeaders(), 'x-secure-id': this.secureId, 'x-secure-cred': this.secureCred, 'x-organization-id': this.orgId },
                    });
                    return { extractedData: res.data.data ?? {}, rawResponse: res.data };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('PAN_OCR');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyITRSalaried(panNumber: string, assessmentYear: string): Promise<ItrResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.itrClient.post('v3/itr-salaried', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), income: d.data?.grossIncome ?? null, taxPaid: d.data?.taxPaid ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('ITR_SALARIED');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async verifyITRBusiness(panNumber: string, assessmentYear: string): Promise<ItrResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.itrClient.post('v3/itr-business', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), income: d.data?.grossIncome ?? null, taxPaid: d.data?.taxPaid ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('ITR_BUSINESS');
                }
            },
            retry: { maxAttempts: 3 },
        });
    }

    async analyzeBankStatement(accountNumber: string, ifsc: string, fromDate: string, toDate: string): Promise<BankStatementResult> {
        return vendorCall({
            vendor: 'perfios',
            fn: async () => {
                try {
                    const res = await this.kycClient.post('v3/bank-statement-analysis', { accountNumber, ifsc, fromDate, toDate, consent: 'Y' });
                    const d = res.data;
                    return { analysed: isSuccess(d.statusCode), averageMonthlyBalance: d.data?.averageMonthlyBalance ?? null, monthlyCredits: d.data?.monthlyCredits ?? null, monthlyDebits: d.data?.monthlyDebits ?? null, rawResponse: d };
                } catch (err) {
                    throw KYC_VENDOR_ERRORS.timeout('BANK_STATEMENT');
                }
            },
            retry: { maxAttempts: 2 },
        });
    }
}
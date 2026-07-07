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
<<<<<<< HEAD
        'x-organization-ID': orgId,
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
                        lat: '19',
                        long: '82',
                        ipAddress: '12.12.12.12',
                        userAgent: 'Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0',
                        consent: 'Y',
                        name: customerName,
                        consentTime: Math.floor(Date.now() / 1000).toString(),
                        consentText: 'Customer consent body to be shared here',
                        clientData: { caseId: `fhr-${Date.now()}` },
                    });
                    const d = res.data;
                    console.log('PERFIOS_CONSENT_RESPONSE:', JSON.stringify(d));
                    const accessKey = d.result?.accessKey ?? null;
                    return { requestId: accessKey, rawResponse: d };
                } catch (err) {
                    const axErr = err as any;
                    console.error('PERFIOS_ERROR:', JSON.stringify(axErr?.response?.data));
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
=======
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
                    const axErr = err as any; console.error('PERFIOS_403_BODY:', JSON.stringify(axErr?.response?.data)); throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
>>>>>>> origin/main
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
<<<<<<< HEAD
                        clientData: { caseId: `fhr-${Date.now()}` },
                    });
                    const d = res.data;
                    console.log('PERFIOS_AADHAAR_VERIFY_RESPONSE:', JSON.stringify(d));
                    return {
                        verified: d['status-code'] === '101',
                        nameOnAadhaar: d.result?.name ?? null,
                        dob: d.result?.dob ?? null,
                        address: d.result?.address ?? null,
=======
                        timestamp: new Date().toISOString(),
                        clientData: { caseId: `fhr-${Date.now()}` },
                    });
                    const d = res.data;
                    return {
                        verified: isSuccess(d.statusCode),
                        nameOnAadhaar: d.data?.name ?? null,
                        dob: d.data?.dob ?? null,
                        address: d.data?.address ?? null,
>>>>>>> origin/main
                        shareCode: null,
                        rawResponse: d,
                    };
                } catch (err) {
<<<<<<< HEAD
                    const axErr = err as any;
                    console.error('PERFIOS_AADHAAR_VERIFY_ERROR:', JSON.stringify(axErr?.response?.data));
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
=======
                    const axErr = err as any; console.error('PERFIOS_403_BODY:', JSON.stringify(axErr?.response?.data)); throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const axErr = err as any;
                    console.error('PERFIOS_403_BODY:', JSON.stringify(axErr?.response?.data));
                    throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
=======
                    const axErr = err as any; console.error('PERFIOS_403_BODY:', JSON.stringify(axErr?.response?.data)); throw KYC_VENDOR_ERRORS.aadhaarVerifyFailed(err);
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v2/pan', { pan: panNumber, name: fullName, dob, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_PAN_RESPONSE:', JSON.stringify(d));
=======
                    const res = await this.kycClient.post('v3/pan', { pan: panNumber, name: fullName, dob, consent: 'Y' });
                    const d = res.data;
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v3/liveness-detection', { url: imageBase64 });
                    const d = res.data;
                    console.log('PERFIOS_LIVENESS_RESPONSE:', JSON.stringify(d));
                    return { passed: d.result?.isLive === true, score: d.result?.livenessScore ?? 0, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/liveness', { img: imageBase64, consent: 'Y' });
                    const d = res.data;
                    return { passed: isSuccess(d.statusCode), score: d.data?.score ?? 0, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v3/facesimilarity', { url1: selfieBase64, url2: idPhotoBase64 });
                    const d = res.data;
                    console.log('PERFIOS_FACE_MATCH_RESPONSE:', JSON.stringify(d));
                    return { matched: d.result?.match === 'yes', confidence: d.result?.matchScore ?? 0, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/face-match', { img1: selfieBase64, img2: idPhotoBase64, consent: 'Y' });
                    const d = res.data;
                    return { matched: isSuccess(d.statusCode), confidence: d.data?.similarity ?? 0, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v3/name', { name1, name2, type: 'individual' });
                    const d = res.data;
                    console.log('PERFIOS_NAME_SIMILARITY_RESPONSE:', JSON.stringify(d));
                    return { similar: d.result?.result === true, score: d.result?.score ?? 0, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/name-similarity', { name1, name2, consent: 'Y' });
                    const d = res.data;
                    return { similar: isSuccess(d.statusCode), score: d.data?.similarityScore ?? 0, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v2/bankacc', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_BANK_RESPONSE:', JSON.stringify(d));
                    return { valid: d.result?.bankTxnStatus === true, nameAtBank: d.result?.accountName ?? null, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/bank-account-verification', { accountNumber, ifsc, name: accountHolder, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v3/bankacc-verification', { accountNumber, ifsc, consent: 'Y', useCombinedSolution: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_BANK_ADV_RESPONSE:', JSON.stringify(d));
                    const source = d.result?.data?.source?.[0];
                    return { valid: source?.data?.bankTxnStatus === true, nameAtBank: source?.data?.accountName ?? null, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/bank-account-verification-advanced', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v3/bankaccverification-non-penny', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_SILENT_BANK_RESPONSE:', JSON.stringify(d));
                    const source = d.result?.data?.source?.[0];
                    return { valid: source?.data?.bankTxnStatus === true, nameAtBank: source?.data?.accountName ?? null, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/silent-bank-account-verification', { accountNumber, ifsc, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), nameAtBank: d.data?.accountName ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.gstClient.post('v2/gstdetailedadditional', { gstin, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_GST_RESPONSE:', JSON.stringify(d));
                    return { valid: isSuccess(d.statusCode), businessName: d.result?.lgnm ?? null, status: d.result?.sts ?? 'UNKNOWN', rawResponse: d };
=======
                    const res = await this.gstClient.post('v3/gst-authentication', { gstin, consent: 'Y' });
                    const d = res.data;
                    return { valid: isSuccess(d.statusCode), businessName: d.data?.legalName ?? null, status: d.data?.gstnStatus ?? 'UNKNOWN', rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kscanClient.post('v3.2/search/aml', { name: fullName, ...(dob ? { dob } : {}), consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_AML_RESPONSE:', JSON.stringify(d));
                    return { flagged: (d.result?.totalHits ?? 0) > 0, matches: d.result?.hits ?? [], rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/aml-sanctions-screening', { name: fullName, ...(dob ? { dob } : {}), consent: 'Y' });
                    const d = res.data;
                    return { flagged: !isSuccess(d.statusCode), matches: d.data?.matches ?? [], rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kscanClient.post('v3/pep/details', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_PEP_RESPONSE:', JSON.stringify(d));
                    return { isPep: (d.result?.totalHits ?? 0) > 0, matches: d.result?.hits ?? [], rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/pep-details', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    return { isPep: !isSuccess(d.statusCode) && (d.data?.pepMatches?.length ?? 0) > 0, matches: d.data?.pepMatches ?? [], rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kscanClient.post('v3/alerts', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_ALERTS_RESPONSE:', JSON.stringify(d));
                    return { flagged: (d.result?.totalHits ?? 0) > 0, alerts: d.result?.hits ?? [], rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/alerts', { name: fullName, consent: 'Y' });
                    const d = res.data;
                    return { flagged: (d.data?.alerts?.length ?? 0) > 0, alerts: d.data?.alerts ?? [], rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kscanClient.post('v3/bank-defaulter', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_BANK_DEFAULTER_RESPONSE:', JSON.stringify(d));
                    return { isDefaulter: (d.result?.totalHits ?? 0) > 0, records: d.result?.hits ?? [], rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/bank-defaulters', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { isDefaulter: !isSuccess(d.statusCode), records: d.data?.defaulterRecords ?? [], rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.kycClient.post('v2/employment-verification-advanced', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_EMPLOYMENT_RESPONSE:', JSON.stringify(d));
                    return { verified: isSuccess(d.statusCode), employerName: d.result?.employerName ?? null, employmentType: d.result?.employmentType ?? null, rawResponse: d };
=======
                    const res = await this.kycClient.post('v3/employment-verification', { pan: panNumber, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), employerName: d.data?.employerName ?? null, employmentType: d.data?.employmentType ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.itrClient.post('v1/itr-return-salaried', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_ITR_SALARIED_RESPONSE:', JSON.stringify(d));
                    return { verified: isSuccess(d.statusCode), income: d.result?.grossIncome ?? null, taxPaid: d.result?.taxPaid ?? null, rawResponse: d };
=======
                    const res = await this.itrClient.post('v3/itr-salaried', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), income: d.data?.grossIncome ?? null, taxPaid: d.data?.taxPaid ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
                    const res = await this.itrClient.post('v1/itr-return-forms', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    console.log('PERFIOS_ITR_BUSINESS_RESPONSE:', JSON.stringify(d));
                    return { verified: isSuccess(d.statusCode), income: d.result?.grossIncome ?? null, taxPaid: d.result?.taxPaid ?? null, rawResponse: d };
=======
                    const res = await this.itrClient.post('v3/itr-business', { pan: panNumber, assessmentYear, consent: 'Y' });
                    const d = res.data;
                    return { verified: isSuccess(d.statusCode), income: d.data?.grossIncome ?? null, taxPaid: d.data?.taxPaid ?? null, rawResponse: d };
>>>>>>> origin/main
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
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main

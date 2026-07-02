// src/providers/kycVerify/stub.ts
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
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('kycVerify:stub');

function delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

export class StubKycVerifyProvider implements IKycVerifyProvider {

    // â”€â”€ Aadhaar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async requestAadhaarConsent(aadhaarNumber: string): Promise<{ requestId: string | null; rawResponse: unknown }> {
        log.debug('STUB: requestAadhaarConsent');
        await delay(50);
        return { requestId: 'stub-access-key-12345', rawResponse: { stub: true } };
    }

    async verifyAadhaar(aadhaarNumber: string): Promise<AadhaarVerifyResult> {
        log.debug('STUB: verifyAadhaar', { aadhaarNumber: '****' + aadhaarNumber.slice(-4) });
        await delay(50);
        return {
            verified: true,
            nameOnAadhaar: 'Rahul Sharma',
            dob: '1990-04-15',
            address: '123, MG Road, Bengaluru, Karnataka - 560001',
            shareCode: 'stub-share-code',
            rawResponse: { status: 'SUCCESS', stub: true },
        };
    }

    async verifyAadhaarMobileLink(aadhaarNumber: string): Promise<{ linked: boolean; rawResponse: unknown }> {
        log.debug('STUB: verifyAadhaarMobileLink', { aadhaarNumber: '****' + aadhaarNumber.slice(-4) });
        await delay(40);
        return { linked: true, rawResponse: { stub: true } };
    }

    // â”€â”€ PAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async verifyPAN(panNumber: string): Promise<PanVerifyResult> {
        log.debug('STUB: verifyPAN', { panNumber });
        await delay(30);
        return {
            verified: true,
            nameOnPan: 'RAHUL SHARMA',
            status: 'VALID',
            rawResponse: { status: 'SUCCESS', stub: true },
        };
    }

    async verifyPANAdvanced(panNumber: string): Promise<PanVerifyResult> {
        log.debug('STUB: verifyPANAdvanced', { panNumber });
        await delay(30);
        return {
            verified: true,
            nameOnPan: 'RAHUL SHARMA',
            status: 'VALID',
            rawResponse: { stub: true },
        };
    }

    async verifyPANAadhaarLinkStatus(panNumber: string): Promise<{ linked: boolean; status: string; rawResponse: unknown }> {
        log.debug('STUB: verifyPANAadhaarLinkStatus', { panNumber });
        await delay(30);
        return { linked: true, status: 'LINKED', rawResponse: { stub: true } };
    }

    // â”€â”€ Face & Liveness â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async matchFace(): Promise<FaceMatchResult> {
        log.debug('STUB: matchFace');
        await delay(80);
        return { matched: true, confidence: 96.5, rawResponse: { stub: true } };
    }

    async checkLiveness(): Promise<LivenessResult> {
        log.debug('STUB: checkLiveness');
        await delay(60);
        return { passed: true, score: 98.2, rawResponse: { stub: true } };
    }

    // â”€â”€ Name â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async checkNameSimilarity(): Promise<NameSimilarityResult> {
        log.debug('STUB: checkNameSimilarity');
        await delay(20);
        return { similar: true, score: 94.0, rawResponse: { stub: true } };
    }

    // â”€â”€ Bank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async verifyBankAccount(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult> {
        log.debug('STUB: verifyBankAccount', { ifsc });
        await delay(60);
        return { valid: true, nameAtBank: 'RAHUL SHARMA', rawResponse: { stub: true } };
    }

    async verifyBankAccountAdvanced(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult> {
        log.debug('STUB: verifyBankAccountAdvanced', { ifsc });
        await delay(60);
        return { valid: true, nameAtBank: 'RAHUL SHARMA', rawResponse: { stub: true } };
    }

    async silentBankVerify(accountNumber: string, ifsc: string): Promise<BankAccountVerifyResult> {
        log.debug('STUB: silentBankVerify', { ifsc });
        await delay(50);
        return { valid: true, nameAtBank: 'RAHUL SHARMA', rawResponse: { stub: true } };
    }

    async analyzeBankStatement(): Promise<BankStatementResult> {
        log.debug('STUB: analyzeBankStatement');
        await delay(100);
        return {
            analysed: true,
            averageMonthlyBalance: 45000,
            monthlyCredits: 55000,
            monthlyDebits: 42000,
            rawResponse: { stub: true },
        };
    }

    // â”€â”€ GST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async verifyGST(gstin: string): Promise<GstVerifyResult> {
        log.debug('STUB: verifyGST', { gstin });
        await delay(40);
        return {
            valid: true,
            businessName: 'STUB ENTERPRISES PVT LTD',
            status: 'ACTIVE',
            rawResponse: { stub: true },
        };
    }

    async extractGSTCertificateOCR(): Promise<OcrResult> {
        log.debug('STUB: extractGSTCertificateOCR');
        await delay(50);
        return {
            extractedData: { gstin: '29ABCDE1234F1Z5', businessName: 'STUB ENTERPRISES PVT LTD' },
            rawResponse: { stub: true },
        };
    }

    // â”€â”€ AML / Risk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async screenAML(): Promise<AmlResult> {
        log.debug('STUB: screenAML');
        await delay(50);
        return { flagged: false, matches: [], rawResponse: { stub: true } };
    }

    async checkPEP(): Promise<PepResult> {
        log.debug('STUB: checkPEP');
        await delay(40);
        return { isPep: false, matches: [], rawResponse: { stub: true } };
    }

    async checkAlerts(): Promise<{ flagged: boolean; alerts: unknown[]; rawResponse: unknown }> {
        log.debug('STUB: checkAlerts');
        await delay(40);
        return { flagged: false, alerts: [], rawResponse: { stub: true } };
    }

    async checkBankDefaulters(): Promise<BankDefaulterResult> {
        log.debug('STUB: checkBankDefaulters');
        await delay(40);
        return { isDefaulter: false, records: [], rawResponse: { stub: true } };
    }

    // â”€â”€ Employment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async verifyEmployment(): Promise<EmploymentVerifyResult> {
        log.debug('STUB: verifyEmployment');
        await delay(50);
        return {
            verified: true,
            employerName: 'STUB COMPANY PVT LTD',
            employmentType: 'SALARIED',
            rawResponse: { stub: true },
        };
    }

    // â”€â”€ ITR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async verifyITRSalaried(): Promise<ItrResult> {
        log.debug('STUB: verifyITRSalaried');
        await delay(60);
        return { verified: true, income: 720000, taxPaid: 45000, rawResponse: { stub: true } };
    }

    async verifyITRBusiness(): Promise<ItrResult> {
        log.debug('STUB: verifyITRBusiness');
        await delay(60);
        return { verified: true, income: 1200000, taxPaid: 120000, rawResponse: { stub: true } };
    }

    // â”€â”€ OCR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async extractAadhaarOCR(): Promise<OcrResult> {
        log.debug('STUB: extractAadhaarOCR');
        await delay(40);
        return {
            extractedData: {
                name: 'Rahul Sharma',
                dob: '15/04/1990',
                gender: 'M',
                address: '123, MG Road, Bengaluru, Karnataka - 560001',
                uid: '1234',
            },
            rawResponse: { stub: true },
        };
    }

    async extractPanOCR(): Promise<OcrResult> {
        log.debug('STUB: extractPanOCR');
        await delay(40);
        return {
            extractedData: {
                name: 'RAHUL SHARMA',
                pan: 'ABCDE1234F',
                dob: '15/04/1990',
                father: 'SURESH SHARMA',
            },
            rawResponse: { stub: true },
        };
    }
}

// src/providers/kycVerify/index.ts
import { PerfiosKycProvider } from './live';
import { StubKycVerifyProvider } from './stub';
import type { IKycVerifyProvider } from './interface';

export type { IKycVerifyProvider } from './interface';
export type {
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

let instance: IKycVerifyProvider | null = null;

export function getKycVerifyProvider(): IKycVerifyProvider {
    if (instance) return instance!;

    const secureId = process.env.PERFIOS_SECURE_ID;

    if (secureId) {
        instance = new PerfiosKycProvider(
            secureId,
            process.env.PERFIOS_SECURE_CRED ?? '',
            process.env.PERFIOS_ORG_ID ?? '',
            process.env.PERFIOS_BASE_URL ?? 'https://hub-test.perfios.ai/ssp/kyc/api/',
            process.env.PERFIOS_GST_URL  ?? 'https://hub-test.perfios.ai/ssp/gst/api/',
            process.env.PERFIOS_ITR_URL  ?? 'https://hub-test.perfios.ai/ssp/itr/',
            process.env.PERFIOS_KSCAN_URL ?? 'https://hub-test.perfios.ai/ssp/kscan/api/',
            30000,
        );
    } else {
        instance = new StubKycVerifyProvider();
    }

    return instance!;
}

export function _resetKycVerifyProvider(): void {
    instance = null;
}

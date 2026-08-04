// src/providers/kycVerify/index.ts
import { PerfiosKycProvider } from './live';
import { StubKycVerifyProvider } from './stub';
import type { IKycVerifyProvider } from './interface';
import { env } from '@/config/env';

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

    // Driven by the validated KYC_PROVIDER setting, not just whether
    // PERFIOS_SECURE_ID happens to be present. Previously this checked
    // secureId presence alone — if it failed to load in production for any
    // transient reason (e.g. a Secrets Manager hiccup), the system would
    // silently fall back to stub mode and "verify" real customer KYC using
    // fake data, with no error and no alert. Now it matches the explicit,
    // fail-loud pattern every other provider in this codebase uses.
    if (env.kyc.provider === 'perfios') {
        if (!env.kyc.secureId || !env.kyc.secureCred || !env.kyc.orgId) {
            throw new Error(
                'getKycVerifyProvider: KYC_PROVIDER=perfios requires ' +
                'PERFIOS_SECURE_ID, PERFIOS_SECURE_CRED and PERFIOS_ORG_ID ' +
                'to be set in environment or Secrets Manager.',
            );
        }

        instance = new PerfiosKycProvider(
            env.kyc.secureId,
            env.kyc.secureCred,
            env.kyc.orgId,
            env.kyc.baseUrl ?? 'https://hub-test.perfios.ai/ssp/kyc/api/',
            process.env.PERFIOS_GST_URL  ?? 'https://hub-test.perfios.ai/ssp/gst/api/',
            process.env.PERFIOS_ITR_URL  ?? 'https://hub-test.perfios.ai/ssp/itr/',
            process.env.PERFIOS_KSCAN_URL ?? 'https://hub-test.perfios.ai/ssp/kscan/api/',
            env.kyc.timeoutMs,
        );
    } else {
        instance = new StubKycVerifyProvider();
    }

    return instance!;
}

export function _resetKycVerifyProvider(): void {
    instance = null;
}
import { mockDelay } from '../../api/api';
import type { DocumentUploadResult } from '@/src/entities/document';
import type { IGoldLoanService } from '../interfaces/IGoldLoanService';
import type {
  GoldEligibility,
  GoldEligibilityRequest,
  GoldLoanAgreementResult,
  GoldLoanApplicationRef,
  GoldLoanAppraisalResult,
  GoldLoanAppointment,
  GoldLoanAppointmentRequest,
  GoldLoanBranch,
  GoldLoanClosureQuote,
  GoldLoanComplianceResult,
  GoldLoanDisbursalStatus,
  GoldLoanMonitoring,
  GoldLoanNachResult,
  GoldRate,
} from '@/src/entities/goldLoan';

const RATE = 6180;
const LTV_RATIO = 0.75;

const BRANCHES: GoldLoanBranch[] = [
  {
    id: 'b1',
    name: 'Fuehrer - Andheri West',
    address: '14, Link Road, Andheri West, Mumbai 400053',
    distance: '1.2 km',
    hours: 'Mon-Sat, 9:30 AM - 5:30 PM',
  },
  {
    id: 'b2',
    name: 'Fuehrer - Bandra East',
    address: '3rd Floor, Maker Bhavan, Bandra East, Mumbai 400051',
    distance: '3.5 km',
    hours: 'Mon-Sat, 10:00 AM - 6:00 PM',
  },
  {
    id: 'b3',
    name: 'Fuehrer - Goregaon',
    address: 'Plot 22, MTNL Road, Goregaon West, Mumbai 400062',
    distance: '5.8 km',
    hours: 'Mon-Sat, 9:00 AM - 5:00 PM',
  },
];

const PURITY: Record<string, number> = {
  '18K': 0.75,
  '20K': 0.833,
  '22K': 0.916,
  '24K': 1,
};

export const mockGoldLoanService: IGoldLoanService = {
  async getGoldRate(): Promise<GoldRate> {
    return mockDelay({
      ratePerGram: RATE,
      source: 'IBJA mock',
      fetchedAt: new Date().toISOString(),
    }, 500);
  },

  async calculateEligibility(request: GoldEligibilityRequest): Promise<GoldEligibility> {
    const purity = PURITY[request.karat] ?? 0.916;
    const goldValue = request.weightGrams * purity * RATE;
    return mockDelay({
      goldValue,
      maxLoanAmount: goldValue * LTV_RATIO,
      ltvRatio: LTV_RATIO,
      ratePerGram: RATE,
      source: 'IBJA mock',
    }, 700);
  },

  async createApplication(): Promise<GoldLoanApplicationRef> {
    return mockDelay({
      applicationId: 'GLA-' + Date.now().toString().slice(-8),
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    }, 600);
  },

  async uploadDocument(
    applicationId: string,
    uri: string,
    type: string,
  ): Promise<DocumentUploadResult> {
    return mockDelay({
      documentId: 'DOC-' + Date.now().toString().slice(-8),
      applicationId,
      type,
      // Echo a fake hosted URL; in mock the local uri is what actually renders.
      url: 'https://mock.fuehrer.in/docs/' + applicationId + '/' + type + '.jpg',
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
    }, 900);
  },

  async runCompliance(applicationId: string): Promise<GoldLoanComplianceResult> {
    return mockDelay({
      applicationId,
      status: 'completed',
      checks: [
        { label: 'AML screening', provider: 'Internal rules engine', status: 'completed' },
        { label: 'PEP check', provider: 'Screening partner', status: 'completed' },
        { label: 'Defaulter database', provider: 'Banking consortium', status: 'completed' },
        { label: 'Alerts screening', provider: 'Risk monitoring', status: 'completed' },
      ],
    }, 1400);
  },

  async getNearbyBranches(): Promise<GoldLoanBranch[]> {
    return mockDelay(BRANCHES, 600);
  },

  async bookBranchAppointment(request: GoldLoanAppointmentRequest): Promise<GoldLoanAppointment> {
    const branch = BRANCHES.find((b) => b.id === request.branchId) ?? BRANCHES[0];
    return mockDelay({
      appointmentId: 'appt_' + Date.now(),
      referenceId: 'FHR-GL-' + Date.now().toString().slice(-6),
      branch,
      date: request.date,
      slot: request.slot,
    }, 900);
  },

  async getAppraisalResult(applicationId: string): Promise<GoldLoanAppraisalResult> {
    return mockDelay({
      applicationId,
      grossWeight: 38.5,
      netWeight: 34.2,
      purity: '22K (91.6%)',
      ratePerGram: RATE,
      assessedValue: 211476,
      finalLoanAmount: 158607,
      ltvRatio: LTV_RATIO,
      photos: ['Front', 'Back', 'Weight scale'],
      appraiserName: 'Branch Appraiser',
      assessedAt: new Date().toISOString(),
    }, 900);
  },

  async acceptFinalLoanAmount(): Promise<void> {
    await mockDelay(null, 700);
  },

  async generateAgreement(applicationId: string): Promise<GoldLoanAgreementResult> {
    return mockDelay({
      agreementId: 'AGR-' + applicationId.slice(-6),
      stampRef: 'NESL-' + Date.now().toString().slice(-8),
      status: 'in_progress',
    }, 900);
  },

  async completeESign(applicationId: string, otp: string): Promise<GoldLoanAgreementResult> {
    if (otp !== '123456') throw { code: 'INVALID_OTP', message: 'Incorrect OTP' };
    return mockDelay({
      agreementId: 'AGR-' + applicationId.slice(-6),
      stampRef: 'NESL-' + Date.now().toString().slice(-8),
      esignRef: 'EMD-' + Date.now().toString().slice(-8),
      status: 'completed',
    }, 1100);
  },

  async initiateNach(): Promise<GoldLoanNachResult> {
    return mockDelay({
      mandateId: 'NACH-' + Date.now().toString().slice(-8),
      status: 'completed',
      debitDate: '5th of every month',
      amount: 27850,
    }, 1200);
  },

  async getDisbursalStatus(): Promise<GoldLoanDisbursalStatus> {
    return mockDelay({
      payoutId: 'RP-PAYOUT-' + Date.now().toString().slice(-8),
      status: 'completed',
      amount: 139500,
      bankAccount: 'HDFC ****4521',
      vaultReceiptId: 'VAULT-GL-' + Date.now().toString().slice(-6),
      vaultName: 'Fuehrer Secured Vault - Andheri West',
    }, 1400);
  },

  async getMonitoring(loanId: string): Promise<GoldLoanMonitoring> {
    return mockDelay({
      loanId,
      currentGoldValue: 204000,
      outstandingAmount: 139500,
      ltvRatio: 0.684,
      lastCheckedAt: new Date().toISOString(),
      alertTriggered: false,
    }, 700);
  },

  async getClosureQuote(loanId: string): Promise<GoldLoanClosureQuote> {
    return mockDelay({
      loanId,
      outstandingAmount: 139500,
      interestAccrued: 1850,
      foreclosureCharges: 0,
      totalPayable: 141350,
      goldReleaseBranch: 'Fuehrer - Andheri West',
      nocRef: 'NOC-GL-' + Date.now().toString().slice(-6),
    }, 700);
  },
};

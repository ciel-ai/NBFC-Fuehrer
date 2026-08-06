// src/api/appraisals.api.ts
//
// Collateral appraisals — gold + housing (web BFF /appraisals/*).
// Backend endpoints exist (Task 2.1 audit); the applications BFF does not
// surface GOLD/HOUSING rows yet, so the live Appraisals queue stays empty
// until that merge — but the capture actions post to the real engine.

import { apiClient } from './client';

export interface GoldAppraisalPayload {
  netWeightGrams: number;            // derived on the frontend, never hand-typed
  grossWeightGrams: number;
  stoneWeightGrams?: number;
  impurityPct?: number;
  purityKarat: number;
  ratePerGram: number;               // ₹/gram
  items?: unknown;                   // free-form item breakdown
}

export interface HousingAssessmentPayload {
  propertyType: string;
  address: string;
  estimatedMarketValue: number;      // ₹ — confirm unit with backend before prod
  propertyAge?: number;
  legalClearance?: boolean;
  builderName?: string;
  constructionStage?: string;
}

export const appraisalsApi = {
  /** Branch staff marks the customer as arrived (gold flow). */
  markArrived: async (loanId: string) => {
    const res = await apiClient.post(`/appraisals/gold/${loanId}/arrive`);
    return res.data.data;
  },

  submitGold: async (loanId: string, payload: GoldAppraisalPayload) => {
    const res = await apiClient.post(`/appraisals/gold/${loanId}`, payload);
    return res.data.data;
  },

  getGold: async (loanId: string) => {
    const res = await apiClient.get(`/appraisals/gold/${loanId}`);
    return res.data.data;
  },

  submitHousing: async (loanId: string, payload: HousingAssessmentPayload) => {
    const res = await apiClient.post(`/appraisals/housing/${loanId}`, payload);
    return res.data.data;
  },

  getHousing: async (loanId: string) => {
    const res = await apiClient.get(`/appraisals/housing/${loanId}`);
    return res.data.data;
  },
};

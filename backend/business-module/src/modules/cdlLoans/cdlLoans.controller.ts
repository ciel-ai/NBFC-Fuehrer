// src/modules/cdlLoans/cdlLoans.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { getValidatedBody, getValidatedParams } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { cdlLoansService } from './cdlLoans.service';
import type { CdlApplicationInput, CdlCreditAssessmentInput, CdlCreditAssessment } from './cdlLoans.types';

export const cdlLoansController = {

    async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const body = getValidatedBody<CdlApplicationInput>(req);
            const result = await cdlLoansService.submitApplication(userId, body);
            res.status(HTTP.CREATED).json(successResponse(result, 'CDL application created'));
        } catch (err) { next(err); }
    },

    async runKycChecks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.runKycChecks(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runComplianceChecks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.runComplianceChecks(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runCreditAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const body = getValidatedBody<CdlCreditAssessmentInput>(req);
            const result = cdlLoansService.runCreditAssessment(id, body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getCreditDecision(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            // cdlCreditDecisionSchema only requires creditStatus/maxLoanAmount
            // (the only two fields the service actually reads) — the rest of
            // CdlCreditAssessment is accepted but optional, since the client
            // conventionally echoes the whole assessment result back.
            const body = getValidatedBody<CdlCreditAssessment>(req);
            const result = await cdlLoansService.getCreditDecision(id, body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async generateAgreement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.generateAgreement(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement generated'));
        } catch (err) { next(err); }
    },

    async completeESign(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.completeESign(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async registerNachMandate(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const { bankAccount, ifsc } = getValidatedBody<{ bankAccount: string; ifsc: string }>(req);
            const result = await cdlLoansService.registerNachMandate(id, { bankAccount, ifsc });
            res.status(HTTP.OK).json(successResponse(result, 'NACH initiated'));
        } catch (err) { next(err); }
    },

    async disburseToMerchant(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const initiatedBy = req.user!.id;
            const body = getValidatedBody<{ merchantName: string; amount: number }>(req);
            const result = await cdlLoansService.disburseToMerchant(id, { ...body, initiatedBy });
            res.status(HTTP.OK).json(successResponse(result, 'Disbursed to merchant'));
        } catch (err) { next(err); }
    },

    async getEmiSchedule(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.getEmiSchedule(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async processManualPayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const collectedBy = req.user!.id;
            const { emiId, amount, collectionId } = getValidatedBody<{ emiId: string; amount: number; collectionId?: string }>(req);
            const result = await cdlLoansService.processManualPayment(id, emiId, amount, collectedBy, collectionId, req);
            res.status(HTTP.OK).json(successResponse(result, 'Payment recorded'));
        } catch (err) { next(err); }
    },

    async handlePaymentFailure(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const { emiId } = getValidatedBody<{ emiId: string }>(req);
            const result = await cdlLoansService.handlePaymentFailure(id, emiId, req);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getOverdueStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.getOverdueStatus(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async closeLoan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.closeLoan(id);
            res.status(HTTP.OK).json(successResponse(result, 'Loan closed'));
        } catch (err) { next(err); }
    },

    async generateNoc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = getValidatedParams<{ id: string }>(req);
            const result = await cdlLoansService.generateNoc(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // activateLoan (POST /loans) removed — loan activation is now automatic:
    // disburseToMerchant transitions DISBURSED -> ACTIVE on synchronous
    // payout confirmation, and disbursement.service.ts's
    // _completeDisbursement does the same for the async (webhook-confirmed)
    // case. Nothing else referenced this endpoint (checked src/, tests/,
    // and the frontend before removing).
};

// src/modules/cdlLoans/cdlLoans.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { cdlLoansService } from './cdlLoans.service';

export const cdlLoansController = {

    async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const result = await cdlLoansService.submitApplication(userId, req.body);
            res.status(HTTP.CREATED).json(successResponse(result, 'CDL application created'));
        } catch (err) { next(err); }
    },

    async runKycChecks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.runKycChecks(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runComplianceChecks(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.runComplianceChecks(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runCreditAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = cdlLoansService.runCreditAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getCreditDecision(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.getCreditDecision(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async generateAgreement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = cdlLoansService.generateAgreement(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement generated'));
        } catch (err) { next(err); }
    },

    async registerNachMandate(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const { bankAccount, ifsc } = req.body;
            const result = await cdlLoansService.registerNachMandate(id, { bankAccount, ifsc });
            res.status(HTTP.OK).json(successResponse(result, 'NACH initiated'));
        } catch (err) { next(err); }
    },

    async disburseToMerchant(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const initiatedBy = req.user!.id;
            const result = await cdlLoansService.disburseToMerchant(id, { ...req.body, initiatedBy });
            res.status(HTTP.OK).json(successResponse(result, 'Disbursed to merchant'));
        } catch (err) { next(err); }
    },

    async getEmiSchedule(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.getEmiSchedule(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async processManualPayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const { emiId } = req.body as { emiId: string };
            const result = await cdlLoansService.processManualPayment(id, emiId, req);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async handlePaymentFailure(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const { emiId } = req.body as { emiId: string };
            const result = await cdlLoansService.handlePaymentFailure(id, emiId, req);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getOverdueStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.getOverdueStatus(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async closeLoan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await cdlLoansService.closeLoan(id);
            res.status(HTTP.OK).json(successResponse(result, 'Loan closed'));
        } catch (err) { next(err); }
    },

    async generateNoc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = cdlLoansService.generateNoc(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    activateLoan: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;
        const result = cdlLoansService.activateLoan(userId, req.body);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
},
};

// src/modules/housingLoans/housingLoans.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { housingLoansService } from './housingLoans.service';

export const housingLoansController = {

    async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = housingLoansService.submitApplication(req.body);
            res.status(HTTP.CREATED).json(successResponse(result, 'Application created'));
        } catch (err) { next(err); }
    },

    async runKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.runKyc(id, req.body.applicant);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runCompliance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.runCompliance(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runIncomeAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.runIncomeAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runCreditAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.runCreditAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async runPropertyAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.runPropertyAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async submitForReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.submitForReview(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getCommitteeDecision(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.getCommitteeDecision(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async generateAgreement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.generateAgreement(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement generated'));
        } catch (err) { next(err); }
    },

    async eSign(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.eSign(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement signed'));
        } catch (err) { next(err); }
    },

    async registerNach(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.registerNach(id, req.body);
            res.status(HTTP.OK).json(successResponse(result, 'NACH initiated'));
        } catch (err) { next(err); }
    },

    async applyPmaySubsidy(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.applyPmaySubsidy(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async disburseToBuilder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.disburseToBuilder(id, req.body);
            res.status(HTTP.OK).json(successResponse(result, 'Disbursed successfully'));
        } catch (err) { next(err); }
    },

    async getEmiSchedule(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.getEmiSchedule(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getPrepaymentQuote(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const amount = Number(req.query['amount'] ?? 0);
            const result = housingLoansService.getPrepaymentQuote(id, amount);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async processPrepayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.processPrepayment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async getOverdueStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.getOverdueStatus(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    async closeLoan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.closeLoan(id);
            res.status(HTTP.OK).json(successResponse(result, 'Loan closed'));
        } catch (err) { next(err); }
    },

    async generateNoc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.generateNoc(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    activateLoan: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;
        const result = housingLoansService.activateLoan(userId, req.body);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
},
};

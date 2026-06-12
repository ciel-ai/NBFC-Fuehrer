// src/modules/goldLoans/goldLoans.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { goldLoansService } from './goldLoans.service';
import type {
    GoldEligibilityRequest,
    GoldLoanAppointmentRequest,
} from './goldLoans.types';

export const goldLoansController = {

    // GET /gold-loans/rate
    getRate(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = goldLoansService.getGoldRate();
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/eligibility
    calculateEligibility(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const body = req.body as GoldEligibilityRequest;
            const result = goldLoansService.calculateEligibility(body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /gold-loans/branches/nearby
    getNearbyBranches(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const result = goldLoansService.getNearbyBranches();
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/appointments
    bookAppointment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const body = req.body as GoldLoanAppointmentRequest;
            const result = goldLoansService.bookAppointment(body);
            res.status(HTTP.CREATED).json(successResponse(result, 'Appointment booked successfully'));
        } catch (err) { next(err); }
    },

    // GET /gold-loans/applications/:id/appraisal
    async getAppraisalResult(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.getAppraisalResult(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/applications/:id/accept-final-amount
    async acceptFinalAmount(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const { amount } = req.body as { amount: number };
            const result = await goldLoansService.acceptFinalAmount(id, amount);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/applications/:id/agreement
    async generateAgreement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.generateAgreement(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement generated'));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/applications/:id/esign
    async completeESign(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const { otp } = req.body as { otp: string };
            const result = await goldLoansService.completeESign(id, otp);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement signed successfully'));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/applications/:id/nach
    async initiateNach(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.initiateNach(id);
            res.status(HTTP.OK).json(successResponse(result, 'NACH mandate initiated'));
        } catch (err) { next(err); }
    },

    // GET /gold-loans/applications/:id/disbursal
    async getDisbursalStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.getDisbursalStatus(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /gold-loans/:id/monitoring
    async getMonitoring(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.getMonitoring(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /gold-loans/:id/closure-quote
    async getClosureQuote(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.getClosureQuote(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /gold-loans/applications/:id/compliance
    async runCompliance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = await goldLoansService.runCompliance(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },
};

// src/modules/goldLoans/goldLoans.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { goldLoansService } from './goldLoans.service';
import { getAuthUser } from '@/types/express';
import { assertApplicationOwnership, assertAccountOwnership } from '@/utils/ownership.util';
import { loansRepository } from '@/modules/loans/loans.repository';

export const goldLoansController = {

    // GET /gold-loans/rate
    async getRate(req: Request, res: Response, next: NextFunction) {
        try {
            const rate = await goldLoansService.getGoldRate();
            res.json({ success: true, data: rate });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/eligibility
    async calculateEligibility(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await goldLoansService.calculateEligibility(req.body);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // GET /gold-loans/branches
    async getNearbyBranches(req: Request, res: Response, next: NextFunction) {
        try {
            const branches = await goldLoansService.getNearbyBranches();
            res.json({ success: true, data: branches });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/appointments
    async bookAppointment(req: Request, res: Response, next: NextFunction) {
        try {
            const { loanId, branchId, preferredDate, preferredSlot } = req.body;
        const userId = req.user!.id;

            const appointment = await goldLoansService.bookAppointment({
                loanId,
                branchId,
                preferredDate,
                preferredSlot,
                userId,
            });
            res.status(201).json({ success: true, data: appointment });
        } catch (err) {
            next(err);
        }
    },

    // GET /gold-loans/appointments/:id
    async getAppointment(req: Request, res: Response, next: NextFunction) {
        try {
            const appointment = await goldLoansService.getAppointment(req.params.id!, req.user!.id, req.user!.role);
            res.json({ success: true, data: appointment });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/appointments/:id/arrive
    async markArrived(req: Request, res: Response, next: NextFunction) {
        try {
            const appointment = await goldLoansService.markArrived(req.params.id!);
            res.json({ success: true, data: appointment });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/appraise
    // POST /gold-loans/applications/:id/appraise
async submitAppraisal(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            grossWeightGrams,
            stoneWeightGrams,
            impurityPct,
            purityKarat,
            ratePerGram,
            items,
            valuedBy,
        } = req.body;

        const result = await goldLoansService.submitAppraisal({
            loanId:           req.params.id!,
            grossWeightGrams,
            stoneWeightGrams,
            impurityPct,
            purityKarat,
            ratePerGram,
            items,
            valuedBy,
        });
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
},

    // GET /gold-loans/applications/:id/appraisal
    async getAppraisalResult(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await goldLoansService.getAppraisalResult(req.params.id!, req.user!.id, req.user!.role);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/accept-final-amount
    async acceptFinalAmount(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const result = await goldLoansService.acceptFinalAmount(
                req.params.id!,
                req.body.amount,
            );
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/agreement
    async generateAgreement(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const result = await goldLoansService.generateAgreement(req.params.id!);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/esign
    async completeESign(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const result = await goldLoansService.completeESign(
                req.params.id!,
                req.body.otp,
            );
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/nach
    async initiateNach(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const { bankAccount, ifsc } = req.body;
            const result = await goldLoansService.initiateNach(req.params.id!, { bankAccount, ifsc });
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // GET /gold-loans/applications/:id/disbursal
    async getDisbursalStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const result = await goldLoansService.getDisbursalStatus(req.params.id!);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // GET /gold-loans/:id/monitoring
    async getMonitoring(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const account = await loansRepository.findAccountByIdOrThrow(req.params.id!);
            assertAccountOwnership(user.id, account, user.role, 'gold loan account');

            const result = await goldLoansService.getMonitoring(req.params.id!, req.user!.id, req.user!.role);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // GET /gold-loans/:id/closure-quote
    async getClosureQuote(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const account = await loansRepository.findAccountByIdOrThrow(req.params.id!);
            assertAccountOwnership(user.id, account, user.role, 'gold loan account');

            const result = await goldLoansService.getClosureQuote(req.params.id!, req.user!.id, req.user!.role);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    // POST /gold-loans/applications/:id/compliance
    async runCompliance(req: Request, res: Response, next: NextFunction) {
        try {
            const user = getAuthUser(req);
            const application = await loansRepository.findApplicationByIdOrThrow(req.params.id!);
            assertApplicationOwnership(user.id, application, user.role, 'gold loan application');

            const result = await goldLoansService.runCompliance(req.params.id!);
            res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },
};
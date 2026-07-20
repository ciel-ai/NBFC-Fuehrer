// src/modules/housingLoans/housingLoans.controller.ts
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '@/types/express';
import { HTTP } from '@/config/constants';
import { successResponse } from '@/types/common.types';
import { housingLoansService } from './housingLoans.service';
import { assertApplicationOwnership, assertAccountOwnership } from '@/utils/ownership.util';
import { loansRepository } from '@/modules/loans/loans.repository';

export const housingLoansController = {

    // POST /housing-loans/applications
    async submitApplication(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.id;
            const result = await housingLoansService.submitApplication(req.body, userId);
            res.status(HTTP.CREATED).json(successResponse(result, 'Application created'));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/kyc
    async runKyc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.runKyc(id, req.body.applicant);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/compliance
    async runCompliance(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.runCompliance(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/income-assessment
    async runIncomeAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.runIncomeAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/credit-assessment
    async runCreditAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.runCreditAssessment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/property-assessment
    async runPropertyAssessment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = await housingLoansService.runPropertyAssessment({
                loanId:               id,
                propertyType:         req.body.propertyType,
                address:              req.body.address,
                estimatedMarketValue: req.body.estimatedMarketValue,
                propertyAge:          req.body.propertyAge,
                legalClearance:       req.body.legalClearance,
                builderName:          req.body.builderName,
                constructionStage:    req.body.constructionStage,
                assessedBy:           req.user!.id,
            });
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/submit-review
    async submitForReview(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = await housingLoansService.submitForReview(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /housing-loans/applications/:id/decision
    async getCommitteeDecision(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = await housingLoansService.getCommitteeDecision(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/agreement
    async generateAgreement(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.generateAgreement(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement generated'));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/esign
    async eSign(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.eSign(id);
            res.status(HTTP.OK).json(successResponse(result, 'Agreement signed'));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/nach
    async registerNach(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.registerNach(id, req.body);
            res.status(HTTP.OK).json(successResponse(result, 'NACH initiated'));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/pmay-subsidy
    async applyPmaySubsidy(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const application = await loansRepository.findApplicationByIdOrThrow(id);
            assertApplicationOwnership(user.id, application, user.role, 'housing loan application');

            const result = housingLoansService.applyPmaySubsidy(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/applications/:id/disburse
    async disburseToBuilder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const result = housingLoansService.disburseToBuilder(id, req.body);
            res.status(HTTP.OK).json(successResponse(result, 'Disbursed successfully'));
        } catch (err) { next(err); }
    },

    // GET /housing-loans/loans/:id/emi-schedule
    async getEmiSchedule(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const result = housingLoansService.getEmiSchedule(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /housing-loans/loans/:id/prepayment-quote
    async getPrepaymentQuote(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id     = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const amount = Number(req.query['amount'] ?? 0);
            const result = housingLoansService.getPrepaymentQuote(id, amount);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/loans/:id/prepayment
    async processPrepayment(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id     = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const result = housingLoansService.processPrepayment(id, req.body);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // GET /housing-loans/loans/:id/overdue
    async getOverdueStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id     = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const result = housingLoansService.getOverdueStatus(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/loans/:id/close
    async closeLoan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id     = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const result = housingLoansService.closeLoan(id);
            res.status(HTTP.OK).json(successResponse(result, 'Loan closed'));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/loans/:id/noc
    async generateNoc(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const id     = req.params['id'] as string;
            const user = req.user!;
            const account = await loansRepository.findAccountByIdOrThrow(id);
            assertAccountOwnership(user.id, account, user.role, 'housing loan account');

            const result = housingLoansService.generateNoc(id);
            res.status(HTTP.OK).json(successResponse(result));
        } catch (err) { next(err); }
    },

    // POST /housing-loans/loans
    activateLoan: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user!.id;
            const result = await housingLoansService.activateLoan(req.body);
            res.status(HTTP.OK).json({ success: true, data: result });
        } catch (err) { next(err); }
    },
};
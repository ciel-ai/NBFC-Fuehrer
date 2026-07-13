// src/modules/web/credit/cdlAutoApproval.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { cdlAutoApprovalService } from '@/modules/cdlLoans/cdlAutoApproval.service';

const router = Router();

const CREDIT_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.CREDIT_MANAGER, ROLE.OPS_EXECUTIVE,
];

// POST /credit/cdl/auto-approve
// Run auto approval engine for a CDL application
router.post('/auto-approve', requireAuth(), allowRoles(...CREDIT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            loanApplicationId,
            requestedAmount,
            tenureMonths,
            customerId,
            employmentType,
            monthlyIncome,
            existingEmis,
            age,
            creditScore,
            hasActiveWriteOff,
            hasFraudAlert,
            hasHighDpd,
            hasMultipleOverdue,
            hasKycMismatch,
            isNewToCredit,
        } = req.body;

        const result = cdlAutoApprovalService.evaluate({
            loanApplicationId,
            requestedAmount,
            tenureMonths,
            customerId,
            employmentType:    employmentType ?? 'SALARIED',
            monthlyIncome,
            existingEmis:      existingEmis ?? 0,
            age,
            creditScore:       creditScore ?? null,
            hasActiveWriteOff: hasActiveWriteOff ?? false,
            hasFraudAlert:     hasFraudAlert ?? false,
            hasHighDpd:        hasHighDpd ?? false,
            hasMultipleOverdue: hasMultipleOverdue ?? false,
            hasKycMismatch:    hasKycMismatch ?? false,
            isNewToCredit:     isNewToCredit ?? false,
        });

        // Save result to DB
        await cdlAutoApprovalService.saveResult(loanApplicationId, result);

        res.status(HTTP.OK).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// GET /credit/cdl/processing-fee?amount=
// Get processing fee for a given loan amount
router.get('/processing-fee', requireAuth(), allowRoles(...CREDIT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const amount = parseFloat(req.query.amount as string);
        if (isNaN(amount)) {
            res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'Invalid amount' });
            return;
        }
        const fee = cdlAutoApprovalService.getProcessingFee(amount);
        res.status(HTTP.OK).json({ success: true, data: { loanAmountRupees: amount, processingFeeRupees: fee } });
    } catch (err) { next(err); }
});

// GET /credit/cdl/interest-rate?employmentType=&creditScore=
// Get applicable interest rate
router.get('/interest-rate', requireAuth(), allowRoles(...CREDIT_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const employmentType = req.query.employmentType as 'SALARIED' | 'SELF_EMPLOYED';
        const creditScore    = req.query.creditScore ? parseInt(req.query.creditScore as string, 10) : null;
        const rate = cdlAutoApprovalService.getInterestRate(employmentType ?? 'SALARIED', creditScore);
        res.status(HTTP.OK).json({ success: true, data: { employmentType, creditScore, interestRate: rate } });
    } catch (err) { next(err); }
});

export { router as cdlAutoApprovalRouter };
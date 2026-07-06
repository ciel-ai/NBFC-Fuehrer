// src/modules/web/lms/lms.payments.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { paymentsService } from '@/modules/payments';

const router = Router();

const LMS_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE, ROLE.COLLECTION_AGENT,
];

// POST /lms/payments/cash
// Record a manual cash/cheque/NEFT payment collected by field agent
router.post('/cash', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const {
            loanAccountId,
            amount,
            paymentMode,
            referenceNumber,
            notes,
            collectedAt,
        } = req.body;

       const result = await paymentsService.recordCashPayment({
            loanAccountId:   req.body.loanAccountId,
            userId:          req.body.userId ?? req.user!.id,
            emiId:           req.body.emiId,
            amount:          req.body.amount,
            collectedBy:     req.user!.id,
            collectionId:    req.body.collectionId ?? `CASH-${Date.now()}`,
        }, req);

        res.status(HTTP.CREATED).json({ success: true, data: result });
    } catch (err) { next(err); }
});

// POST /lms/payments/link
// Generate a payment link for overdue EMI
router.post('/link', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { loanAccountId, amount, description } = req.body;

        const result = await paymentsService.createPaymentLink({
            loanAccountId:  req.body.loanAccountId,
            userId:         req.body.userId,
            emiId:          req.body.emiId,
            customerName:   req.body.customerName,
            customerPhone:  req.body.customerPhone,
            amount:         req.body.amount,
            description:    req.body.description ?? 'EMI Payment',
            expiryMinutes:  req.body.expiryMinutes ?? 60,
        }, req);

        res.status(HTTP.CREATED).json({ success: true, data: result });
    } catch (err) { next(err); }
});

export { router as lmsPaymentsRouter };
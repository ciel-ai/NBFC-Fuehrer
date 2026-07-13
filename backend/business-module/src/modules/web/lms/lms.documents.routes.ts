// src/modules/web/lms/lms.documents.routes.ts
import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { requireAuth, allowRoles } from '@/middlewares';
import { ROLE, HTTP } from '@/config/constants';
import type { AuthRequest } from '@/types/express';
import { pdfService } from '@/modules/documents/pdf.service';

const router = Router();

const LMS_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN,
    ROLE.FINANCE, ROLE.COLLECTION_AGENT,
];

const FINANCE_ROLES = [
    ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.FINANCE,
];

// GET /lms/documents/receipt/:paymentId
router.get('/receipt/:paymentId', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const pdf = await pdfService.generatePaymentReceipt(req.params.paymentId as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${req.params.paymentId}.pdf"`);
        res.status(HTTP.OK).send(pdf);
    } catch (err) { next(err); }
});

// GET /lms/documents/noc/:loanAccountId
router.get('/noc/:loanAccountId', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const pdf = await pdfService.generateNoc(req.params.loanAccountId as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="noc-${req.params.loanAccountId}.pdf"`);
        res.status(HTTP.OK).send(pdf);
    } catch (err) { next(err); }
});

// GET /lms/documents/statement/:loanAccountId
router.get('/statement/:loanAccountId', requireAuth(), allowRoles(...LMS_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const pdf = await pdfService.generateLoanStatement(req.params.loanAccountId as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="statement-${req.params.loanAccountId}.pdf"`);
        res.status(HTTP.OK).send(pdf);
    } catch (err) { next(err); }
});

// GET /lms/documents/closure/:loanAccountId
router.get('/closure/:loanAccountId', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const pdf = await pdfService.generateClosureLetter(req.params.loanAccountId as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="closure-${req.params.loanAccountId}.pdf"`);
        res.status(HTTP.OK).send(pdf);
    } catch (err) { next(err); }
});

// GET /lms/documents/legal-notice/:loanAccountId
router.get('/legal-notice/:loanAccountId', requireAuth(), allowRoles(...FINANCE_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const pdf = await pdfService.generateLegalNotice(req.params.loanAccountId as string);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="legal-notice-${req.params.loanAccountId}.pdf"`);
        res.status(HTTP.OK).send(pdf);
    } catch (err) { next(err); }
});

export { router as lmsDocumentsRouter };
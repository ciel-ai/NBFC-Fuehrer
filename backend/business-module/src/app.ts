// src/app.ts
import { profileRouter } from '@/modules/profile';
import { notificationsRouter } from '@/modules/notifications/notifications.routes';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { corsMiddleware } from '@/config/cors';
import { env } from '@/config/env';
import {
    requestLogger,
    verifyToken,
    generalLimiter,
    auditTrail,
    errorHandler,
    notFoundHandler,
} from '@/middlewares';
import { bootstrapEventHandlers } from '@/events';
import { moneyConverterMiddleware } from '@/middlewares/moneyConverter.middleware';

// â”€â”€ Module routers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { authRouter } from '@/modules/auth';
import { healthRouter } from '@/modules/health';
import { webhooksRouter } from '@/modules/webhooks';
import { kycRouter } from '@/modules/kyc';
import { loansRouter } from '@/modules/loans';
import { emiRouter } from '@/modules/emi';
import { underwritingRouter } from '@/modules/underwriting';
import { disbursementRouter } from '@/modules/disbursement';
import { paymentsRouter } from '@/modules/payments';
import { agentsRouter } from '@/modules/agents';
import { collectionsRouter } from '@/modules/collections';
import { auditRouter } from '@/modules/audit';
import { reportsRouter } from '@/modules/reports';
import { adminRouter } from '@/modules/admin';
import { goldLoansRouter } from '@/modules/goldLoans';
import { housingLoansRouter } from '@/modules/housingLoans';
import { cdlLoansRouter } from '@/modules/cdlLoans';
import { salesRouter } from '@/modules/sales';
import { webRouter } from '@/modules/web/web.routes';

export function createApp(): express.Application {
    const app = express();
    const api = `/api/${env.apiVersion}`;

    // â”€â”€ 1. Security headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(helmet({
        contentSecurityPolicy: env.isProd,
        crossOriginEmbedderPolicy: false,
    }));

    // â”€â”€ 2. CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(corsMiddleware);

    // â”€â”€ 3. Request logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(requestLogger());

    // â”€â”€ 4. Rate limiter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(generalLimiter);

    // â”€â”€ 5. Health â€” no auth, no body parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use('/health', healthRouter);

    // â”€â”€ 6. Webhooks â€” MUST be before express.json() â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(`${api}/webhooks`, webhooksRouter);

    // â”€â”€ 7. Body parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(compression());

    // â”€â”€ 8. JWT verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(verifyToken());

    // â”€â”€ 9. Audit trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(auditTrail());
    // ── Money converter — rupees → paise in all responses ───────────────────────
app.use(moneyConverterMiddleware());

    // â”€â”€ 10. Bootstrap event + notification handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bootstrapEventHandlers();

    // â”€â”€ 11. Domain routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use('/auth', authRouter);
    app.use('/user', profileRouter);
app.use(`${api}/notifications`, notificationsRouter);
    app.use(`${api}/kyc`, kycRouter);
    app.use(`${api}/loans`, loansRouter);
    app.use(`${api}/emi`, emiRouter);
    app.use(`${api}/underwriting`, underwritingRouter);
    app.use(`${api}/disbursement`, disbursementRouter);
    app.use(`${api}/payments`, paymentsRouter);
    app.use(`${api}/agents`, agentsRouter);
    app.use(`${api}/collections`, collectionsRouter);
    app.use(`${api}/audit`, auditRouter);
    app.use(`${api}/reports`, reportsRouter);
    app.use(`${api}/admin`, adminRouter);
    app.use(`${api}/gold-loans`, goldLoansRouter);
    app.use(`${api}/housing-loans`, housingLoansRouter);
    app.use(`${api}/consumer-durable-loans`, cdlLoansRouter);
    app.use(`${api}/sales`, salesRouter);
    app.use(`${api}`, webRouter);

    // â”€â”€ 12. 404 handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(notFoundHandler());

    // â”€â”€ 13. Global error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    app.use(errorHandler());

    return app;
}

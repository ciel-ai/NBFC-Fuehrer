// src/modules/health/health.routes.ts
//
// Health routes deliberately have NO middleware:
//   - No verifyToken  — load balancers don't send auth headers
//   - No rateLimiter  — probes run every 30s from multiple AZs
//   - No auditTrail   — health checks generate noise, not signal
//   - No requestLogger body logging — but requestId is still attached
//     by the global requestLogger middleware mounted in app.ts

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { healthController } from './health.controller';
import { env } from '@/config/env';
import { HTTP } from '@/config/constants';

const router = Router();

// App Runner liveness probe
router.get('/live', healthController.live);

// App Runner readiness probe
router.get('/ready', healthController.ready);

// Full diagnostics previously had no application-level protection at all —
// safety depended entirely on an assumption (stated only in a code comment)
// that this route is never exposed via the load balancer in production, a
// network-layer control living outside this repo that couldn't be verified.
// This shared-secret check is a real, code-enforced backstop that works
// independently of network configuration. Fails CLOSED: if
// HEALTH_CHECK_SECRET is never configured, this endpoint stays locked
// rather than defaulting open.
function requireHealthSecret(req: Request, res: Response, next: NextFunction): void {
    const provided = req.header('x-health-check-key');

    if (!env.healthCheckSecret || provided !== env.healthCheckSecret) {
        res.status(HTTP.FORBIDDEN).json({
            success: false,
            errorCode: 'FORBIDDEN',
            message: 'Full health diagnostics require a valid X-Health-Check-Key header.',
        });
        return;
    }

    next();
}

router.get('/', requireHealthSecret, healthController.full);

export { router as healthRouter };

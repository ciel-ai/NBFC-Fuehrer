// src/middlewares/stubGuard.middleware.ts
//
// Blocks routes that currently call hardcoded stub logic (no DB writes,
// fake success responses) — see goldLoans.service.ts / housingLoans.service.ts
// "Downstream stubs" sections. Prevents anyone from mistaking a fake
// success for a real disbursal/agreement/closure.

import type { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import { HTTP } from '@/config/constants';

export function stubGuard() {
    return (req: Request, res: Response, next: NextFunction) => {
        if (env.features.enableUnwiredLoanStubs) return next();

        res.status(HTTP.INTERNAL_ERROR).json({
            success: false,
            errorCode: 'FEATURE_NOT_WIRED',
            message: 'This step is not yet connected to the real processing pipeline. Contact engineering before relying on this response.',
        });
    };
}
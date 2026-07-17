// src/middlewares/idempotency.middleware.ts
//
// Prevents duplicate financial transactions on retry.
// Apply to payment and disbursement routes only.
//
// Client sends: Idempotency-Key: <unique-key> header
// First request  — reserves the key atomically (INSERT), then processes,
//                   then fills in the real response.
// Concurrent retry with the same key while the first is still in-flight
//                — rejected with 409, since the real result isn't known yet.
// Retry after completion — returns the stored response, no reprocessing.
//
// The key fix vs. the previous version: the row is created BEFORE the
// handler runs (relying on the unique constraint on `key` to atomically
// reject concurrent duplicates), not after — closing the race window where
// two simultaneous requests with the same key could both slip past a
// check-then-insert and both execute the real business logic.

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('idempotency');

const EXPIRY_HOURS = 24;

export function idempotency() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = req.headers['idempotency-key'] as string | undefined;

        if (!key) {
            next();
            return;
        }

        if (key.length > 255) {
            res.status(400).json({
                success:   false,
                errorCode: 'INVALID_IDEMPOTENCY_KEY',
                message:   'Idempotency-Key must be 255 characters or fewer',
            });
            return;
        }

        const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

        try {
            // Atomically reserve this key. If another request already holds
            // it (in-flight or completed), this throws P2002 — handled below.
            await prisma.idempotency_keys.create({
                data: {
                    key,
                    request_path: req.path,
                    response:     Prisma.JsonNull,
                    status_code:  null,
                    expires_at:   expiresAt,
                },
            });

        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                // Key already exists — either completed (replay it) or still
                // in-flight from a concurrent request (reject, don't guess).
                const existing = await prisma.idempotency_keys.findUnique({ where: { key } });

                if (existing?.status_code != null) {
                    log.info('Idempotent replay', { key, path: req.path });
                    res.status(existing.status_code).json(existing.response as object);
                    return;
                }

                log.warn('Concurrent duplicate request rejected', { key, path: req.path });
                res.status(409).json({
                    success:   false,
                    errorCode: 'REQUEST_IN_PROGRESS',
                    message:   'A request with this Idempotency-Key is already being processed.',
                });
                return;
            }

            log.error('Idempotency middleware error', { key, error: err });
            next(err);
            return;
        }

        // Key reserved successfully — intercept the response to fill it in.
        const originalJson = res.json.bind(res);
        let statusCode = 200;

        const originalStatus = res.status.bind(res);
        res.status = (code: number) => {
            statusCode = code;
            return originalStatus(code);
        };

        res.json = (body: any) => {
            prisma.idempotency_keys.update({
                where: { key },
                data: {
                    response:    body,
                    status_code: statusCode,
                },
            }).catch((err) => {
                log.error('Failed to finalize idempotency key', { key, error: err });
            });

            return originalJson(body);
        };

        next();
    };
}

// ─── Cleanup job — run daily to remove expired keys ──────────────────────────

export async function cleanupExpiredIdempotencyKeys(): Promise<void> {
    const result = await prisma.idempotency_keys.deleteMany({
        where: { expires_at: { lt: new Date() } },
    });
    log.info('Cleaned up expired idempotency keys', { deleted: result.count });
}
// src/middlewares/idempotency.middleware.ts
//
// Prevents duplicate financial transactions on retry.
// Apply to payment and disbursement routes only.
//
// Client sends: Idempotency-Key: <unique-key> header
// First request — processes normally, stores response
// Retry with same key — returns stored response, no reprocessing

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';

const log = createModuleLogger('idempotency');

// Keys expire after 24 hours
const EXPIRY_HOURS = 24;

export function idempotency() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const key = req.headers['idempotency-key'] as string | undefined;

        // If no key provided — skip idempotency check, process normally
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

        try {
            // Check if we've already processed this key
            const existing = await prisma.idempotency_keys.findUnique({
                where: { key },
            });

            if (existing) {
                // Key already used — return stored response
                log.info('Idempotent replay', { key, path: req.path });
                res.status(existing.status_code).json(existing.response);
                return;
            }

            // Key is new — intercept response to store it
            const originalJson = res.json.bind(res);
            let statusCode = 200;

            const originalStatus = res.status.bind(res);
            res.status = (code: number) => {
                statusCode = code;
                return originalStatus(code);
            };

            res.json = (body: any) => {
                // Store the response with this key
                const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

                prisma.idempotency_keys.create({
                    data: {
                        key,
                        request_path: req.path,
                        response:     body,
                        status_code:  statusCode,
                        expires_at:   expiresAt,
                        created_at:   new Date(),
                    },
                }).catch((err) => {
                    log.error('Failed to store idempotency key', { key, error: err });
                });

                return originalJson(body);
            };

            next();
        } catch (err) {
            log.error('Idempotency middleware error', { key, error: err });
            next(err);
        }
    };
}

// ─── Cleanup job — run daily to remove expired keys ──────────────────────────

export async function cleanupExpiredIdempotencyKeys(): Promise<void> {
    const result = await prisma.idempotency_keys.deleteMany({
        where: { expires_at: { lt: new Date() } },
    });
    log.info('Cleaned up expired idempotency keys', { deleted: result.count });
}
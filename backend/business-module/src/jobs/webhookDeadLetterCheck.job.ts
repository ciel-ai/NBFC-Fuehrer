// src/jobs/webhookDeadLetterCheck.job.ts
//
// Razorpay retries a failed webhook delivery on its own (executeWithAudit in
// webhooks.service.ts re-throws on handler failure specifically so the
// controller returns 5xx and triggers that retry) — but Razorpay's own retry
// window eventually expires. If every retry attempt failed, the event is
// gone for good and nothing currently notices: it just sits as a FAILED row
// in webhook_logs with no alert, no retry, no visibility. This job finds
// those dead-lettered events and surfaces them so a human can investigate
// and, if needed, manually reconcile whatever the webhook was reporting.

import cron from 'node-cron';
import { randomUUID } from 'crypto';
import { prisma } from '@/config/database';
import { createModuleLogger } from '@/config/logger';
import { CRON_SCHEDULE } from '@/config/constants';
import { acquireLock, releaseLock, RedisTTL } from '@/config/redis';
import { reportError } from '@/config/crashReporter';

const log = createModuleLogger('job:webhookDeadLetterCheck');

const JOB_LOCK_KEY = 'lock:cron:webhook-dead-letter-check';

// Razorpay's own webhook retry window is roughly 24 hours — a FAILED event
// older than that with no later successful delivery for the same
// (source, gateway_event_id) has genuinely exhausted its retries.
const DEAD_LETTER_THRESHOLD_HOURS = 24;

export async function runWebhookDeadLetterCheckJob(): Promise<void> {
    const jobStart = Date.now();

    const lockToken = randomUUID();
    const lockAcquired = await acquireLock(JOB_LOCK_KEY, RedisTTL.CRON_JOB_LOCK, lockToken);

    if (!lockAcquired) {
        log.warn('Webhook dead-letter check skipped — another instance already holds the lock');
        return;
    }

    log.info('Webhook dead-letter check started');

    try {
        const threshold = new Date(Date.now() - DEAD_LETTER_THRESHOLD_HOURS * 60 * 60 * 1000);

        const failedEvents = await prisma.webhook_logs.findMany({
            where: {
                status: 'FAILED',
                received_at: { lt: threshold },
                gateway_event_id: { not: null },
            },
            select: {
                id: true,
                source: true,
                event: true,
                gateway_event_id: true,
                error_message: true,
                received_at: true,
            },
        });

        const deadLettered: typeof failedEvents = [];

        for (const failed of failedEvents) {
            const laterSuccess = await prisma.webhook_logs.findFirst({
                where: {
                    source: failed.source,
                    gateway_event_id: failed.gateway_event_id,
                    status: { in: ['PROCESSED', 'SKIPPED'] },
                    received_at: { gt: failed.received_at },
                },
                select: { id: true },
            });

            if (!laterSuccess) {
                deadLettered.push(failed);
            }
        }

        if (deadLettered.length > 0) {
            reportError(
                new Error(`${deadLettered.length} webhook(s) exhausted retries with no successful delivery`),
                {
                    deadLetteredEvents: deadLettered.map((e) => ({
                        webhookLogId: e.id,
                        source: e.source,
                        event: e.event,
                        gatewayEventId: e.gateway_event_id,
                        errorMessage: e.error_message,
                        receivedAt: e.received_at,
                    })),
                },
            );
        }

        log.info('Webhook dead-letter check completed', {
            failedEventsChecked: failedEvents.length,
            deadLettered: deadLettered.length,
            durationMs: Date.now() - jobStart,
        });

    } catch (err) {
        log.error('Webhook dead-letter check crashed', {
            error: (err as Error).message,
            stack: (err as Error).stack,
            durationMs: Date.now() - jobStart,
        });
    } finally {
        await releaseLock(JOB_LOCK_KEY, lockToken);
    }
}

export function scheduleWebhookDeadLetterCheckJob(): cron.ScheduledTask {
    log.info('Webhook dead-letter check job scheduled', { schedule: CRON_SCHEDULE.WEBHOOK_DEAD_LETTER_CHECK });
    return cron.schedule(CRON_SCHEDULE.WEBHOOK_DEAD_LETTER_CHECK, runWebhookDeadLetterCheckJob, {
        timezone: 'Asia/Kolkata',
    });
}
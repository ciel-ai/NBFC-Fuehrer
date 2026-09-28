// ═════════════════════════════════════════════════════════════════════════
// ⚠️  ORPHANED — UNDER REVIEW FOR DELETION. DO NOT DEPLOY THIS FILE.  ⚠️
//
// This backend/server.js (and its sibling backend/prisma/) is a stale
// duplicate superseded by backend/user-module/. It is not referenced by
// any npm workspace, CI workflow, Dockerfile, docker-compose.yml, or
// deploy.yml — confirmed by repo-wide search. It also can't actually run:
// it requires './src/app' and there is no backend/src/ directory at all.
//
// Deletion is pending confirmation from the infra/DB team on whether
// backend/prisma/schema.prisma was ever migrated against a real database
// (its schema has diverged from backend/user-module/prisma/schema.prisma
// and contains models — agents, audit_logs, emi_schedule,
// loan_applications, payments — that don't exist there). Until that
// answer comes back, do NOT deploy this file and do NOT run it against
// any real environment.
// ═════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const { validateEnv } = require('./src/config/env');
validateEnv();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const PORT = process.env.PORT || 3000;

const { startCleanupJob } = require('./src/jobs/cleanupBlacklist');

const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    startCleanupJob();
});

process.on('unhandledRejection', (error) => {
  logger.error({ message: 'Unhandled rejection', error: error.message, stack: error.stack });
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  logger.error({ message: 'Uncaught exception', error: error.message, stack: error.stack });
  process.exit(1);
});

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev

# Generate Prisma client in production image
RUN npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy config files needed at runtime
COPY tsconfig.json ./

# Copy entrypoint (runs migrations before starting the server)
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001
USER nodeuser

# Expose port
EXPOSE 3000

# Health check — uses /health/live (pure liveness, no DB/Redis dependency
# check) instead of the previous /health (full diagnostics endpoint, which
# checks DB+Redis and returns 503 on failure). Using the full-diagnostics
# endpoint here conflated liveness with readiness: a brief downstream DB or
# Redis blip would get a perfectly healthy Node process restarted by the
# orchestrator, which is the worst possible response to a transient
# dependency issue. Also switched from wget to Node's built-in http module —
# wget's presence on this base image depends on Alpine's busybox applet set,
# which is an unnecessary point of fragility when Node itself is already
# guaranteed present.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
    
# Start server (runs migrations first)
ENTRYPOINT ["./docker-entrypoint.sh"]
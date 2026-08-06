# Admin panel — two-stage build: Vite bundle → nginx static serve.
# Build from the REPO ROOT (workspaces need the root package-lock):
#   docker build -f frontend/web/admin/Dockerfile -t fuehrer-admin .
# Run:
#   docker run -p 8080:8080 fuehrer-admin

FROM node:20-alpine AS build
WORKDIR /repo

# Workspace manifests first — layer-cache npm ci against lockfile changes only.
COPY package.json package-lock.json .npmrc ./
COPY frontend/web/admin/package.json frontend/web/admin/
RUN npm ci --workspace=frontend/web/admin --include-workspace-root=false

COPY frontend/web/admin frontend/web/admin
# .env.production drives VITE_* values; the build fails in src/config.ts if
# it still says VITE_USE_MOCK=true.
RUN npm run build --workspace=frontend/web/admin

FROM nginx:1.27-alpine
COPY frontend/web/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/web/admin/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1

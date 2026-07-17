# Multi-stage build for the game server (MFP-09).
# Portable to Cloud Run / ECS Fargate / Azure Container Apps. Runs as non-root,
# production dependencies only at runtime.

# ---- builder: install everything and compile TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app

# Manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY server/package.json server/
RUN npm ci

# Sources needed to build the shared package and the server.
COPY packages/game-core packages/game-core
COPY server server
RUN npm run build:core && npm run build -w hello-world-mobile-server

# ---- runtime: minimal image with production deps + built output ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production-only dependencies (workspace symlinks resolve game-core → dist).
COPY package.json package-lock.json ./
COPY packages/game-core/package.json packages/game-core/
COPY server/package.json server/
RUN npm ci --omit=dev && npm cache clean --force

# Compiled artifacts from the builder stage.
COPY --from=builder /app/packages/game-core/dist packages/game-core/dist
COPY --from=builder /app/server/dist server/dist

# Drop privileges. node:alpine ships a non-root `node` user.
# The runtime writes nothing to the image FS, so a read-only root filesystem is
# safe to enable at the orchestrator level (see deploy/ and docker-compose.yml).
USER node

EXPOSE 3001
CMD ["node", "server/dist/index.js"]

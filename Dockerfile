# SynthMR: Next.js (web) or BullMQ worker. Set BUILD_PROCESS=web|worker to choose run command.
FROM node:20-slim AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Generate Prisma client
FROM base AS prisma
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
RUN npx prisma generate

# Build Next.js (needed for both web and worker so worker has same node_modules)
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image: web (standalone server) + worker (full app for tsx)
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Web: Next.js standalone server
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Worker: full app (tsx + prisma + src)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# DATA_DIR for worker (and web if needed). Create so runtime can write.
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 8080
ENV PORT=8080

# Web default. fly.toml [processes] overrides for worker to "npm run worker"
CMD ["node", "server.js"]

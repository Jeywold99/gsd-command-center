# GSD Command Center — one image runs both the Next.js app and the Socket.IO
# server (the compose file overrides the command per service).
#
# Build ON the Raspberry Pi (arm64) so npm fetches the correct native binaries
# (lightningcss, @next/swc, etc.):   docker compose up -d --build

FROM node:22-bookworm-slim

WORKDIR /app

# openssl → Prisma engines; tini → clean signal handling / no zombie procs.
RUN apt-get update && apt-get install -y --no-install-recommends openssl tini \
  && rm -rf /var/lib/apt/lists/*

# Install ALL deps (dev included — needed for `next build`, prisma CLI, tsx).
COPY package.json package-lock.json ./
RUN npm ci

# App source.
COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at build time, so the public
# URL must be present now (passed as a build arg from docker-compose).
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL

# Generate the Prisma client (gitignored → must be built here) + build.
# prisma.config.ts resolves DATABASE_URL via env(); `prisma generate` reads the
# config but never connects, so a throwaway URL satisfies it. Scoped to this RUN
# only (not baked into the image) — the real DATABASE_URL is injected at runtime.
RUN export DATABASE_URL="postgresql://build:build@localhost:5432/build" \
  && npx prisma generate \
  && npm run build

ENV NODE_ENV=production
EXPOSE 3000 3001

# tini as PID 1 for correct SIGTERM handling on `docker compose down`.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "run", "start"]

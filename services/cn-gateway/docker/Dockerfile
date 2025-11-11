# syntax=docker/dockerfile:1.7

FROM node:20-bookworm AS builder
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY services ./services
COPY shared ./shared
COPY packages ./packages
COPY apps ./apps

RUN corepack enable pnpm
RUN pnpm install --filter @greenbro/cn-gateway... --frozen-lockfile
RUN pnpm --filter @greenbro/cn-gateway... build
RUN pnpm deploy --filter @greenbro/cn-gateway --prod /opt/app

FROM gcr.io/distroless/nodejs20-debian12:nonroot
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /opt/app ./
COPY services/cn-gateway/docker/healthcheck.mjs ./healthcheck.mjs

USER 10001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD ["/nodejs/bin/node", "/app/healthcheck.mjs"]

CMD ["dist/server.js"]

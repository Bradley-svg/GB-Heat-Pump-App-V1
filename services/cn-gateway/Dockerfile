FROM node:20-alpine AS build
WORKDIR /srv/app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

FROM gcr.io/distroless/nodejs20
WORKDIR /srv/app
COPY --from=build /srv/app/dist ./dist
ENV NODE_ENV=production
CMD ["dist/server.js"]

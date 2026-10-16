FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json admin/package.json
COPY api/package.json api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter portfolio-photos-admin...
COPY . .
RUN pnpm --filter portfolio-photos-admin build

FROM caddy:2-alpine AS runner
ENV ADMIN_API_ORIGIN=https://portfolio-api.gadcoder.com
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/admin/dist /srv
EXPOSE 8080

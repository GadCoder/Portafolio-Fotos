FROM node:24-bookworm-slim

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json admin/package.json
COPY api/package.json api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter @portfolio-photos/api...

COPY api api
COPY packages/contracts packages/contracts
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build pnpm --filter @portfolio-photos/api build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "--filter", "@portfolio-photos/api", "start"]

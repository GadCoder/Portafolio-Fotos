# Build static export
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable

# Install deps first (better cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY admin/package.json admin/package.json
COPY api/package.json api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile --filter portfolio-photos...

# Build
COPY . .
# next.config.js is configured for output: "export"
RUN pnpm --filter @portfolio-photos/contracts build && pnpm build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/out/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

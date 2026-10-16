# Photography API workspace

This Fastify service is being migrated from the Python API in phases. It runs
independently from the static Next.js portfolio and Vite admin while sharing
the monorepo's pnpm workspace and `@portfolio-photos/contracts` package.

## Local development

Use Node.js 24 and pnpm 10 from the repository root. Copy `api/.env.example` to
`api/.env`, set working PostgreSQL and S3-compatible storage values, then run:

```sh
pnpm install
pnpm --filter @portfolio-photos/contracts build
pnpm dev:api
```

The service listens on port 8080 by default. `GET /healthz` is available for
container health checks. The database schema is managed from the existing
Alembic head during migration work; the Node service must not run Prisma DDL
until its baseline has been reviewed and explicitly switched over.

## Shared API contracts

Photo, series, session, login, upload, and mutation schemas live in
`packages/contracts`. Their inferred TypeScript types are consumed by both
frontends and the API. Prisma-generated model types remain private to this
workspace and are mapped to JSON DTOs at the API boundary.

## Deployment

`api/compose.yaml` builds from the repository root and attaches to the existing
Dokploy network. Configure the same database, S3, admin credential, origin
allowlist, and Cloudflare deploy-hook environment values used by the Python
service. The deploy-hook URL must remain a server-only secret.

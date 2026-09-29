# OUTSiiDE

OUTSiiDE is a participation-first social platform for short-form video, Stories, Live, The Porch, Circles, Receipts, messaging, creator tools, and a private Owner HQ.

## Product principles
- Participate, don't just watch.
- Give users understandable feed controls.
- Give small/new creators meaningful discovery opportunities.
- Build safety and moderation into the product.
- Keep private staff/admin access separate from public product access.
- No marketplace or product storefronts.

## Repository foundation
This repository begins with the production web foundation. The architecture is intentionally modular so web, iOS/Android, APIs, realtime systems, media processing, moderation, payments, and analytics can grow without rewriting the product.

## Initial routes
- `/` — product/feed landing shell
- `/live` — OUTSiiDE Live
- `/porch` — The Porch
- `/circles` — Circles
- `/receipts` — Receipts
- `/messages` — messaging
- `/studio` — Creator Studio
- `/hq` — Owner HQ

## Local development
```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Database environments
The Prisma schema uses both `DATABASE_URL` and `DIRECT_URL`.

- `DATABASE_URL` is the application/runtime PostgreSQL connection. With Supabase this may be the pooler/runtime connection.
- `DIRECT_URL` must be a direct PostgreSQL connection suitable for Prisma migrations. Do not use a transaction-pooler URL here.

Never commit real database credentials.

### Development migrations
Use this only while developing schema changes locally:

```bash
npm run db:migrate
```

### Production migration deployment
Production and hosted databases must use the checked-in migration history:

```bash
npm run db:deploy
npm run db:status
```

Do not use `prisma migrate dev` against production or Supabase production databases.

## Important
The repository contains the production web foundation and an expanding set of implemented platform systems. External infrastructure still needs environment-specific configuration and end-to-end validation before public launch, including production database credentials, media/realtime services, payment processing, moderation operations, and mobile distribution.

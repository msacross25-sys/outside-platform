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
- `/hq` — Owner HQ placeholder (must be protected before production)

## Local development
```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Important
This is the production codebase foundation, not a claim that all platform systems are complete. Authentication, database persistence, media processing, realtime Live/Porch infrastructure, payments, moderation services, and mobile apps are staged work and must be implemented/tested before public launch.

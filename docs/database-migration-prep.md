# Database migration prep

This file records the schema work that must be migrated before OUTSiiDE is deployed against a production database.

## Migration scope
- Live room settings: music, chat controls, screen sharing, replay/analytics fields.
- Verified viewing: activity verification and indexes for one-active-session lookup.
- Clips: likes, comments and featured clips.
- Host onboarding: agreement, identity verification, tax onboarding and payout enablement.
- Owner/HQ roles and finance separation.
- Gift and payout accounting: gift ledger states, Creator payouts and payout ledger entries.
- Effects ownership and effect gifts.
- Favorites: pinned Hosts and Porches.
- Battles and battle teams.
- Monthly Top 20 Host ranking.
- Notification types and achievement/badge support.

## Integrity expectations
- Existing rows must receive safe defaults for all newly required fields.
- Foreign keys must preserve financial records with Restrict where configured.
- Composite IDs/unique constraints protect follows, favorites, stage requests, likes and rank rows.
- Payout and gift state changes remain application-audited; production payment-provider reconciliation is separate from the database migration.
- No coin-transfer or user cash-out table is part of the schema. Creator earnings flow through GiftTransaction -> CreatorPayout -> PayoutLedgerEntry.
- MonthlyHostRank has the required inverse User relation.

## Before applying
1. Generate the Prisma client and validate the schema.
2. Create and inspect one migration from the accumulated schema changes.
3. Review generated SQL for destructive operations before applying it.
4. Back up any non-development database before migration.
5. Apply to a disposable/staging database first.
6. Run TypeScript/build and the financial/Live smoke tests before production.

No migration has been applied by this document. Local Prisma commands are intentionally deferred until the final local verification step.

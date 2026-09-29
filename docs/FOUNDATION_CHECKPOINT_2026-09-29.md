# OUTSiiDE Foundation Checkpoint — 2026-09-29

This checkpoint records what has been verified so later work does not accidentally treat a screen, schema, or partial integration as a finished production system.

## Verified foundation

### Repository and CI
- Next.js/TypeScript application builds in CI.
- Prisma schema validation and client generation run in CI.
- CI starts PostgreSQL and applies the full checked-in Prisma migration history from an empty database.
- CI checks migration-history/schema drift.
- ESLint runs in CI; correctness rules remain blocking while legacy type/style debt is reported as warnings.
- Production browser responses have baseline security headers.
- Prisma migration SQL uses LF line endings to avoid Windows checksum drift.

### Database
- Supabase production project is connected and healthy.
- Prisma migration history was repaired to include the historical verified-viewing-session migration already present in production.
- The current application schema has been applied to Supabase.
- The foreign-key supporting index migration has been applied to Supabase.
- Supabase performance advisor no longer reports unindexed foreign keys.
- Supabase Data API is disabled because OUTSiiDE currently accesses application tables through Prisma/PostgreSQL rather than browser PostgREST.
- RLS is therefore not being used as the application's authorization layer today. If the Data API is ever re-enabled, RLS/grants must be designed before exposing any application table.

### Social authorization and privacy
- Block relationships are enforced on follow creation, direct messages, feed/search, post access and profile access.
- Blocking removes follows and pending follow requests in both directions.
- Pending private follow requests cannot be approved after a block or requester deactivation.
- Direct post pages, likes, comments and saves enforce post visibility.
- Comment creation honors the post author's comment privacy setting.
- Profile post/replay visibility is filtered by the viewer's relationship to the account.
- Private accounts do not expose their profile content to non-followers.
- hideConnections and hideActivity are honored by profile surfaces covered by this checkpoint.
- Notifications hide blocked and muted actors.
- The premature "recently active" Following surface was removed until activity privacy is fully specified and tested.

### The Porch / Live room authorization
- Central Porch access handles PUBLIC, FOLLOWERS and PRIVATE visibility.
- Banned users cannot rejoin a room.
- Hosts have a complete Ban -> banned list -> Unban management path.
- Kicks/bans clear stage requests, live presence and signaling state.
- Moderators cannot moderate protected host/co-host/moderator roles beyond their authority.
- Viewer/host media signaling and room access are permission-gated.
- Verified viewing requires valid live-room membership and does not count the host's own viewing.
- Battle durations and team-size rules are enforced by the backend.
- The /live page uses real public live/scheduled rooms rather than a fake stream.
- Monthly Top 20 Host data is backed by stored rankings and the defined score formula.

### Gifts and finance bookkeeping
- Gift sending requires age 18+ and an available coin balance.
- Live gift sending requires valid live-room access.
- Creator financial analytics and replay earnings use SETTLED gifts rather than pending gifts.
- Finance status changes require Owner finance access and an audit reason.
- Gift and payout ledger transition entries record net financial deltas instead of repeatedly recording the full amount.
- Payment processor, coin purchasing and payout-provider integrations are NOT production-connected yet.

## Implemented but not yet production-complete

These areas have code/UI foundations but require external infrastructure or deeper testing before public launch:

- Live media transport at scale. Current browser WebRTC signaling is not a production SFU/HLS architecture. TURN credentials and capacity/reconnect/load testing are still required.
- Media uploads. The upload-request endpoint intentionally returns unavailable until an object/video storage provider, signed upload flow, scanning and transcoding are connected.
- Coin purchasing and real-money payments.
- Creator identity/tax/payout-provider onboarding for all creator tiers.
- Push notifications and background delivery.
- Email verification, password reset/account recovery, login throttling/bot protection and owner/staff MFA.
- Real-time messaging delivery/typing/read-receipt experience beyond the current database/API foundation.
- Production observability: error tracking, structured logs, uptime alerts, backup/restore drills.
- Mobile iOS/Android clients and app-store release work.
- Legal/operational launch work: Terms, Privacy Policy, Community Guidelines, DMCA/copyright process, accessibility, support/incident procedures and staged rollout.

## Rules for future work

1. Do not call a feature production-ready because a route or screen exists.
2. Every schema change must include a checked-in Prisma migration and pass the full migration-chain CI test.
3. Never use `prisma migrate dev`, `prisma migrate reset` or `prisma db push` against production.
4. Never re-enable the Supabase Data API for application tables without reviewed grants/RLS policies.
5. Financial totals exposed as earnings must be based on settled/reconciled transactions.
6. Authorization must be enforced in the API/server layer, not only hidden in the UI.
7. New privacy controls must be enforced across every surface that exposes the affected data.
8. New Live features must be tested for host, moderator, speaker, listener, banned user and unauthorized user paths.
9. CI must stay green before merging to `main`.
10. Before public launch, complete the remaining items in `docs/LAUNCH_CHECKLIST.md` and run a production smoke/load/security test.

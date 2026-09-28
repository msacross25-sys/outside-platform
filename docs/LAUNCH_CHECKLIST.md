# OUTSiiDE launch checklist

This is the remaining-work checklist. A committed feature is not considered launch-ready until it is migrated, tested, secured and verified in the production environment.

## Foundation
- Provision production PostgreSQL and run reviewed Prisma migrations.
- Add staging database and seed/test data.
- Run clean install, Prisma generate, typecheck, lint, build and automated tests in CI.
- Add error tracking, structured logs, uptime monitoring, backups and restore drills.
- Configure production hosting, domain, DNS, TLS and environment secrets.

## Accounts and security
- Email verification, password reset and account recovery.
- Login/signup rate limits, brute-force protection and session rotation/revocation.
- CSRF review, secure headers, input validation, bot protection and abuse throttles.
- Device/session management and security-event history.
- MFA for owner/staff; optional user MFA later.
- Account deletion/export and privacy controls.
- Review all authorization paths, especially blocks and private resources.

## Feed and social graph
- Make home feed use the shared block/mute safety filter everywhere.
- Enforce blocks on follows, profiles, comments, reactions, messaging and search.
- Following and Circles feeds; Local only with privacy-safe coarse location and opt-in.
- Feed ranking, pagination/infinite scroll, deduplication and recommendation controls.
- Wire comment counts/state, optimistic UI and accessible loading/error states.
- Friends/mutual-follow behavior.

## Media and creation
- Select production object/video storage provider.
- Implement signed direct uploads and provider callbacks.
- Verify uploaded bytes server-side; malware/abuse scanning.
- Video transcoding, adaptive playback, thumbnails/posters and metadata.
- Upload progress, retry/resume, deletion and orphan cleanup.
- Camera recording, editing, captions, alt text, drafts, scheduling and privacy controls.
- Filters/effects/lenses; Live effects are a later real-time subsystem.
- Music/sound licensing before a music catalog launches.

## Stories
- Photo/video Stories and upload pipeline.
- Story viewer, viewer list where appropriate, privacy controls, replies and highlights.
- Background cleanup of expired Story media.

## Search and discovery
- Pagination, ranking and typo-tolerant indexing.
- Add Lives, Porch, Circles, sounds and topics.
- Trending system and abuse-resistant trend calculations.
- Search privacy/block enforcement.

## Notifications
- Comment/follow/like notifications exist; add preferences and deduplication rules.
- Push notifications through APNs/FCM/web push.
- Live, Porch, Circle, message and creator notifications.
- Background delivery and unread badges.

## Messaging
- Harden direct-conversation uniqueness against race conditions.
- Enforce block checks when sending/reading, not only when starting.
- Message requests and DM privacy settings.
- Group DMs, replies, reactions, media, voice notes and disappearing media.
- Real-time delivery, typing indicators, read receipts UI and push notifications.
- Spam limits, reporting and moderation tools.

## Circles
- Join/leave UI and private/invite approval flows.
- Circle posts/feed, chat, Stories, Live, Porch and events.
- Member management, role changes, bans, moderation and audit history.
- Ownership transfer/close workflow.
- Paid Circles only after payments are production-ready.

## The Porch
- Join UI and host controls.
- Start/end/cancel room workflows and permission enforcement.
- Raise hand, speaker queue, co-host/mod tools, chat, polls and Q&A.
- Real-time audio/video provider or WebRTC/SFU infrastructure.
- Recording consent, replay/clips, moderation and scheduling reminders.
- Capacity/scaling tests and reconnect behavior.

## Receipts
- Source attachments, dated updates and corrections.
- Source-file/screenshot support through media pipeline.
- Clear language that Receipts are author-provided sources, not a truth guarantee.
- Abuse/reporting rules for malicious or private documents.

## Live
- Entire production Live transport remains to be built.
- Broadcast setup, guest queue, multi-guest, chat, moderators, Q&A/polls/reactions.
- HLS at scale plus WebRTC for interactive participants.
- Live safety/reporting and emergency escalation.
- Scheduling, replay/clips and creator controls.
- Lenses, filters, beauty controls, backgrounds, gift-triggered effects and fallbacks.
- Load, latency and moderation testing.

## Creator Studio and money
- Real analytics event pipeline and dashboards.
- Earnings ledger, tips, gifts, subscriptions and ticketed digital events.
- Payment processor, payout provider, identity/tax requirements, refunds and chargebacks.
- Wallet reconciliation and financial audit trails.
- Revenue share only after accounting/legal review.

## Owner HQ
- Separate staff authentication boundary.
- MFA, RBAC and least-privilege permissions.
- User/content/report/appeal/verification/support tools.
- Live Safety Center.
- Immutable audit logs including owner actions.
- Financial dashboard, payout controls and reconciliation.
- Feature flags, system health, analytics and algorithm-control parameters.
- Sensitive-data access reason logging.

## Moderation and safety
- Complete report queues, evidence, case notes, strikes, appeals and escalation.
- Content safety processing for uploads and Live.
- Child-safety and emergency escalation procedures.
- Keyword/comment filters, restrict controls and user safety center.
- Moderator permissions, quality review and auditability.
- Abuse rate limits and anti-spam systems.

## Mobile apps
- Build React Native iOS/Android clients or finalize native strategy.
- Camera/mic/library, push, deep links, share sheet, background audio and supported PiP.
- Secure token/session storage and biometric entry where appropriate.
- App Store/Google Play packaging, privacy disclosures, review compliance and testing.

## Legal and launch operations
- Terms, Privacy Policy, Community Guidelines, Creator Terms, copyright/DMCA process.
- Age/minor protections and applicable privacy compliance.
- Accessibility review.
- Trademark/name clearance.
- Support processes, incident response, status communications and moderation staffing.
- Closed alpha, security review, load test, beta, staged rollout and rollback plan.
- Final production smoke test on web/iOS/Android before public launch.

# OUTSiiDE Architecture

## Clients
- Web: Next.js + TypeScript
- Mobile: planned React Native iOS/Android clients with native camera/media modules
- Owner HQ: protected staff experience; may later be isolated into its own deployable app

## Platform modules
Auth, User, Profile, Social Graph, Content, Media, Feed, Recommendation, Live, Porch, Circle, Chat, Notification, Search, Moderation, Payment, Analytics, Admin.

Start as a modular application and split high-scale workloads only when justified.

## Data layer
Planned: PostgreSQL for durable relational data, Redis for cache/presence/queues, OpenSearch for discovery/search, object storage + CDN for media.

## Media
Upload -> validation/security -> original object storage -> transcoding workers -> adaptive renditions -> thumbnails/captions -> safety processing -> CDN/feed eligibility.

## Realtime
WebSockets for chat/presence and interactive state. WebRTC for interactive Live/Porch participation. Large audiences should use scalable broadcast delivery such as adaptive HLS rather than peer-to-peer fan-out.

## Safety
Reports and moderation are first-class entities. High-risk Live reports must be escalatable. Staff access follows least privilege. Staff and owner actions are audit logged.

## Security baseline
TLS, secure password hashing/auth provider, staff MFA, rate limiting, bot/DDoS protection, secure sessions, secret management, backups, monitoring, vulnerability management and penetration testing.

## Environments
Development -> testing -> staging -> production. Production secrets and data must not be committed to Git or casually exposed to development environments.

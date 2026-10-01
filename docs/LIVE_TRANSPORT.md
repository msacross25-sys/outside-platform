# OUTSiiDE Production Live Transport

Production Live media uses a LiveKit SFU. OUTSiiDE remains the authority for room membership, roles, safety, monetization and viewing credit.

## Responsibility boundary

OUTSiiDE owns:
- user identity and sessions
- Porch room visibility and membership
- host / co-host / moderator / speaker / listener roles
- stage requests and invitations
- room bans, kicks and restrictions
- battles and team rules
- chat and reactions
- gifts and financial records
- verified viewing progress
- Live analytics and replay metadata
- host eligibility and achievements

LiveKit owns:
- WebRTC media routing through an SFU
- camera/microphone track publication
- remote track subscription
- participant media connection state
- media-room disconnects
- later: recording / HLS / egress

Do not move business rules into LiveKit metadata or client-side checks.

## Production environment

```
LIVE_MEDIA_PROVIDER=livekit
LIVEKIT_URL=wss://<your-livekit-host>
LIVEKIT_API_KEY=<server-only key>
LIVEKIT_API_SECRET=<server-only secret>
```

The API secret must never be exposed to a browser or committed to the repository.

`LIVEKIT_TEST_MODE` is CI-only and must never be enabled in production.

## Participant token rules

Tokens are minted only by:

```
POST /api/porch/[slug]/livekit-token
```

The endpoint requires:
- an authenticated OUTSiiDE user
- a LIVE Porch
- current Porch membership
- no room ban

Permissions are derived from the current OUTSiiDE role.

Publisher roles:
- HOST
- COHOST
- SPEAKER

Subscribe-only roles:
- LISTENER
- MODERATOR unless separately promoted into a publishing role

Tokens are short-lived. The API secret remains server-side.

## Stage changes

When a host approves a stage request or a user accepts an invitation:
1. OUTSiiDE updates the PorchMember role.
2. OUTSiiDE asks LiveKit to grant publishing permission.
3. The client reconnect path can obtain a fresh role-scoped token if permission synchronization is interrupted.

When a host removes a speaker:
1. OUTSiiDE changes the role back to LISTENER.
2. LiveKit publishing permission is revoked.
3. Published tracks are removed by the media service.

## Kick and ban

Kick and ban always update OUTSiiDE first.

After the database state changes:
- OUTSiiDE requests immediate LiveKit participant removal.
- the browser continues polling OUTSiiDE membership
- if membership/access disappears, the client disconnects from LiveKit itself
- banned users cannot mint another LiveKit token

This gives moderation a second enforcement path if the external media API has a temporary failure.

## Live lifecycle

START:
- refuses to start in LiveKit mode if production media is not configured
- prepares the LiveKit room
- then marks the OUTSiiDE Porch LIVE

END:
- marks the Porch ENDED
- deletes the LiveKit room
- closes verified viewing sessions
- calculates analytics
- creates/updates replay metadata

If media-room cleanup fails, OUTSiiDE remains authoritative and clients lose room access through the membership/status checks.

## Mesh fallback

The old browser-to-browser WebRTC mesh transport remains only as an explicit development fallback:

```
LIVE_MEDIA_PROVIDER=mesh
```

When LiveKit mode is active:
- legacy TURN configuration returns HTTP 410
- legacy Postgres signaling returns HTTP 410

Production readiness and production preflight both reject mesh mode.

## CI

CI runs:

```
LIVE_MEDIA_PROVIDER=livekit
LIVEKIT_TEST_MODE=true
```

No external LiveKit project is contacted.

The runtime suite verifies:
- LiveKit provider readiness
- host publish permission
- listener subscribe-only permission
- stage promotion grants publishing
- stage removal revokes publishing
- room bans prevent fresh token issuance
- all existing Live lifecycle and moderation tests continue passing

## Recording and replay media

The current LiveReplay model stores replay metadata. Production recording media is a separate next step.

LiveKit Egress can later create:
- MP4 room recordings
- HLS output
- external RTMP streams

Recorded outputs should be written into OUTSiiDE-controlled private storage and then linked to the existing replay authorization model. Do not expose raw provider URLs directly to users.

## Scale testing before launch

Before a public release:
- test host + 5-person stage
- test hundreds of subscribe-only viewers
- test reconnects on Wi-Fi/mobile network transitions
- test camera/mic permission denial
- test speaker promotion/removal during active media
- test kick/ban during active media
- test host disconnect/reconnect
- test SFU region latency
- test provider quota/limit alarms
- test room end under load
- confirm verified-viewing logic is not dependent on media-provider events alone

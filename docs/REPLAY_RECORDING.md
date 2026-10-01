# OUTSiiDE Live Replay Recording

OUTSiiDE records production Lives through LiveKit Egress and stores the resulting MP4 in the same private S3-compatible media bucket used by protected post media.

## Production settings

```
LIVE_MEDIA_PROVIDER=livekit
LIVE_RECORDING_MODE=livekit
LIVEKIT_URL=wss://<your-livekit-host>
LIVEKIT_API_KEY=<server-only key>
LIVEKIT_API_SECRET=<server-only secret>

MEDIA_STORAGE_MODE=s3
MEDIA_S3_ENDPOINT=<private object storage endpoint>
MEDIA_S3_REGION=auto
MEDIA_S3_BUCKET=<private bucket>
MEDIA_S3_ACCESS_KEY_ID=<server-only key>
MEDIA_S3_SECRET_ACCESS_KEY=<server-only secret>
NEXT_PUBLIC_APP_URL=https://<your-production-domain>
```

`LIVEKIT_TEST_MODE` and `LIVE_RECORDING_TEST_MODE` are CI-only and must be false or unset in production.

## Recording lifecycle

When a host starts a Live:

1. OUTSiiDE prepares the LiveKit room.
2. OUTSiiDE creates or resets the LiveReplay row as PENDING.
3. LiveKit Room Composite Egress starts.
4. The recording target is:
   `replays/<roomId>/full.mp4`
5. LiveKit receives an extra per-egress webhook pointing to:
   `/api/webhooks/livekit`
6. Only after media setup does the Porch move into LIVE state.

When the host ends the Live:

1. OUTSiiDE marks the Porch ENDED.
2. OUTSiiDE asks LiveKit to stop active egresses for that room.
3. OUTSiiDE deletes the LiveKit media room.
4. Viewing sessions and Live analytics are finalized.
5. The replay remains PENDING until LiveKit confirms the file completed.

## Webhook security

LiveKit egress events are accepted only through the server SDK `WebhookReceiver`.

The handler:
- requires an Authorization header
- verifies the webhook signature against the LiveKit API key/secret
- reads the raw request body
- ignores unrelated event types
- maps the LiveKit room name back to the OUTSiiDE room ID
- never trusts a browser to mark a replay READY

A successful `egress_ended` event with a completed file marks the replay READY and creates the replay-ready notification.

A failed or incomplete egress marks the replay FAILED.

Repeated successful webhook delivery is idempotent for the replay-ready notification.

## Replay delivery

The private bucket is never exposed directly.

Replay playback uses:

```
GET /api/porch/[slug]/replay-media
```

That route enforces:
- replay READY status
- replay visibility
- private-room rules
- followers-only rules
- host ownership

Authorized playback receives a short-lived signed object-store redirect.

Host download uses:

```
GET /api/porch/[slug]/replay-media?download=1
```

The signed object URL requests attachment disposition so the browser downloads the MP4 instead of treating the link as normal playback.

## Deletion

When the host deletes a replay:
- the replay becomes DELETED
- visibility is disabled
- media/download URLs are cleared
- OUTSiiDE deletes the private object on a best-effort basis
- replay delivery immediately returns 404 even if object deletion temporarily fails

Object-storage lifecycle policies are still recommended as a second cleanup layer.

## Failure behavior

A recording failure does not erase:
- Live analytics
- gift records
- verified viewing
- follower gains
- comments/reactions
- achievement data

The host sees a clear Replay recording failed state. Viewers never see unfinished or failed replays.

## CI

CI runs with:

```
LIVE_RECORDING_MODE=livekit
LIVE_RECORDING_TEST_MODE=true
```

No real LiveKit Egress job or object-storage recording is created.

The runtime smoke suite proves:
- Live starts with recording enabled
- ending the Live produces READY replay state in test mode
- replay uses the protected OUTSiiDE media route
- owner playback works
- allowed viewer playback works
- host download works
- replay-ready notification is emitted once
- host deletion works
- deleted replay media is inaccessible

## Production verification before public launch

Before opening beta:
- record a real VIDEO Live
- record a real VOICE Live
- confirm MP4 appears in the private bucket
- confirm signed webhook reaches OUTSiiDE
- confirm replay changes PENDING → READY
- confirm public replay access
- confirm followers-only replay access
- confirm private replay denial
- confirm host download
- confirm replay deletion removes access and storage object
- test recorder failure and quota exhaustion
- test room end while recording is still finalizing

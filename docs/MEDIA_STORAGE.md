# OUTSiiDE Media Storage

OUTSiiDE uses direct browser uploads to a private S3-compatible object store. The browser receives a short-lived signed PUT URL, but never receives the storage access key or secret.

## Required production settings

```
MEDIA_STORAGE_MODE=s3
MEDIA_SIGNING_SECRET=<long random stable secret>
MEDIA_S3_ENDPOINT=<S3-compatible endpoint>
MEDIA_S3_REGION=auto
MEDIA_S3_BUCKET=<private bucket>
MEDIA_S3_ACCESS_KEY_ID=<server-only access key>
MEDIA_S3_SECRET_ACCESS_KEY=<server-only secret>
MEDIA_S3_SESSION_TOKEN=<optional temporary-credential token>
```

`MEDIA_SIGNING_SECRET` must remain stable after launch because existing stored media delivery URLs are signed with it. If it ever must be rotated, existing media URLs need to be re-signed in the database as part of that rotation.

## Bucket requirements

The bucket must remain private. Do not make the object bucket publicly readable.

The browser needs CORS permission only for direct uploads from the OUTSiiDE web origin. Configure the object-store CORS policy to allow:

- the production OUTSiiDE web origin
- method: PUT
- request header: Content-Type
- no public wildcard origin in production

HEAD, DELETE and signed download creation are server-side operations and do not need browser CORS access.

## Upload contract

1. The signed-in client asks `POST /api/media/upload-request` for authorization.
2. OUTSiiDE validates MIME type and declared file size.
3. The server creates an unguessable user-scoped object key and a short-lived signed PUT URL.
4. The browser uploads directly to object storage.
5. The client calls `POST /api/media/complete`.
6. OUTSiiDE verifies that the object exists and that the stored size/type match the authorized file.
7. The server returns a signed completed-media receipt.
8. `POST /api/posts` accepts only valid completed receipts that belong to the current user.
9. The database stores an internal OUTSiiDE media URL, not the raw object-store URL.

Arbitrary external URLs are rejected by post creation.

## Private delivery

Post media is delivered through `/api/media/content/[token]`.

That route:

- verifies the media delivery token
- confirms that the token corresponds to a stored Media row
- reuses the central post-access rules
- enforces public/followers/friends/private visibility
- enforces block/mute/account-state restrictions
- returns a short-lived signed object download redirect

The storage bucket therefore stays private even when some posts are public.

## Abandoned objects

`DELETE /api/media/discard` can delete an authorized upload that was never attached to a post. Once a Media row references the object, discard is rejected.

A provider-side lifecycle rule for abandoned `uploads/` objects is still recommended as a second cleanup layer.

## Current limits

- Images: 15 MB
- Videos: 500 MB
- Post media: up to 10 items
- Supported images: JPEG, PNG, WebP, HEIC
- Supported videos: MP4, QuickTime/MOV, WebM

## Video processing

This storage layer protects and stores original video uploads, but it is not the final social-video delivery architecture.

Before public launch at scale, OUTSiiDE still needs a transcoding pipeline for:

- adaptive bitrate renditions
- normalized codecs/containers
- thumbnails/posters
- duration/dimension metadata
- scanning/moderation hooks
- retry/error states
- lifecycle cleanup
- optimized streaming delivery

That system should consume the private source objects created by this upload pipeline rather than replacing the upload/security contract.

## CI

CI runs with:

```
MEDIA_STORAGE_MODE=test
ALLOW_TEST_MEDIA_STORAGE=true
```

The runtime smoke suite validates authorization, upload completion, forged URL rejection, tampered receipt rejection, private media delivery, post attachment and abandoned-object cleanup without requiring a real external bucket.

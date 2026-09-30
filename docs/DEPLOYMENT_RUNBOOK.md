# OUTSiiDE Production Deployment Runbook

OUTSiiDE ships as a standalone Next.js production container. Every merge to `main` publishes a versioned image to GitHub Container Registry.

## Release artifact

Image:
```
ghcr.io/msacross25-sys/outside-platform
```

Tags:
- `latest`
- `sha-<full-git-commit>`

Always record the exact SHA-tag deployed to production. Do not treat `latest` as a rollback target.

## Production prerequisites

Before deployment, configure all required environment variables from `.env.example`.

Mandatory systems:
- PostgreSQL/Supabase runtime connection
- Prisma direct migration connection
- authentication secrets
- MFA encryption key
- HTTPS application URL
- transactional email provider
- private S3-compatible media storage

Run:
```
npm run deploy:preflight
npx prisma migrate status
```

Do not deploy if either command fails.

## Database migration order

Database changes are deployed before application traffic is moved to the new release.

Safe order:
1. Take/confirm a current database backup or restore point.
2. Run `npx prisma migrate status`.
3. Run `npx prisma migrate deploy`.
4. Run `npx prisma migrate status` again.
5. Start the new application image.
6. Require `/api/health` to return HTTP 200.
7. Require `/api/ready` to return HTTP 200.
8. Move production traffic to the new release.

Never run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` against production.

## Container start

Example:

```
docker run -d \
  --name outside-web \
  --restart unless-stopped \
  --env-file /secure/path/outside.production.env \
  -p 3000:3000 \
  ghcr.io/msacross25-sys/outside-platform:sha-<commit>
```

Keep the environment file outside the repository and readable only by the deployment account.

## Health checks

Liveness:
```
GET /api/health
```

Use liveness to determine whether the web process is running.

Readiness:
```
GET /api/ready
```

Use readiness before routing user traffic. It verifies the database, security schema, required security configuration, transactional email, private media storage, and HTTPS app URL.

Detailed readiness is available only to an MFA-verified Owner through Owner HQ.

## Monitoring

External uptime monitoring should check:
- `/api/health` frequently for process availability
- `/api/ready` for dependency/configuration readiness

Alerts should trigger when either endpoint repeatedly fails.

Server logs are emitted as JSON. Production log collection should preserve at least:
- timestamp
- level
- service
- event
- release
- route path
- request method
- error digest when present

Do not log passwords, session cookies, authorization headers, raw database connection strings, MFA secrets, recovery codes, API keys, or private message bodies.

## Automated production monitoring

OUTSiiDE includes a non-destructive production monitor at:

```
scripts/production-smoke.mjs
```

It verifies:
- `/api/health`
- `/api/ready`
- HTTPS in production
- HSTS
- frame protection
- content-type protection
- referrer policy
- permissions policy
- framework disclosure is disabled
- optional exact release SHA

Manual check:

```
PRODUCTION_BASE_URL=https://your-domain.example npm run monitor:production
```

GitHub Actions also includes `Production Monitor`, scheduled every five minutes.

To activate scheduled monitoring after the real production domain exists, set the repository variable:

```
PRODUCTION_BASE_URL=https://your-production-domain
```

The scheduled job remains dormant while that repository variable is unset.

For a manual release verification, run the workflow with the production URL and, when desired, the exact deployed release SHA.

## Rollback

A rollback uses the exact previously healthy SHA-tag.

1. Do not reverse database migrations automatically.
2. Identify the last known healthy application image.
3. Start that SHA-tag with the same production secrets.
4. Verify `/api/health`.
5. Verify `/api/ready`.
6. Route traffic back to the prior image.
7. Preserve logs from the failed release for diagnosis.

If a new migration is not backward-compatible with the prior application image, do not roll back blindly. Fix forward or use a reviewed database recovery plan.

## Database backups

Production launch requires a verified backup/restore process.

Before public launch:
- enable the strongest Supabase backup/PITR option available for the production plan
- confirm backup retention
- record the restore procedure
- perform a restore drill into a separate non-production project/database
- verify the restored application can pass `/api/ready`

A backup is not considered proven until a restore has been tested.

After restoring into a separate non-production database, point `DATABASE_URL` and `DIRECT_URL` at that restored database and run:

```
npx prisma migrate status
npm run db:restore-verify
```

The restore verifier is read-only. It confirms:
- repository migration history matches the restored database
- no unfinished migrations remain
- critical authentication, social, Live, media and financial tables are readable

Do not run a restore drill against the live production database.

## Secrets

Production secrets belong in the hosting provider's encrypted secret store.

Rotate immediately if a secret is pasted into:
- source control
- an issue or pull request
- build logs
- chat or support messages
- shell history in plain text

After rotating a database password or signing secret, update every production service that depends on it before sending traffic.

## Release checklist

A production release is allowed only when:
- CI is green
- the production container image exists for the exact commit
- migration status is clean
- production preflight passes
- the new image starts successfully
- liveness is green
- readiness is green
- Owner HQ System Health is green
- rollback SHA is recorded
- monitoring is active
- current backup/restore coverage is confirmed

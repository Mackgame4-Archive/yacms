# Forte CMS

A self-hosted, multi-tenant CMS for independent static websites. It uses Next.js App Router, MongoDB/Mongoose, custom database sessions, and S3-compatible media storage. The first consumer is the separate `website-unifato` Astro repository.

## Local setup

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`. S3 values are required only for media operations, not `next build`.
2. Install and create the first administrator:

   ```powershell
   npm ci
   $env:MONGODB_URI='mongodb://localhost:27017/forte-cms'
   npm run admin:create -- --email admin@example.com --name "Platform Admin" --password "a-long-unique-password"
   ```

3. Import Unifato without overwriting existing edits:

   ```powershell
   npm run seed:unifato
   # Import public/assets to S3, verify them, register Media records, and rewrite imported URLs:
   npm run seed:unifato -- --upload-media
   # Deliberately replace existing content:
   npm run seed:unifato -- --overwrite
   ```

4. Run `npm run dev`, sign in at `/login`, open Unifato → API keys, and create a key. Copy it immediately.
5. In `website-unifato`, copy `.env.example` to `.env` and set `CMS_URL`, `CMS_WEBSITE_SLUG=unifato`, and the secret `CMS_API_KEY`. Do not use an Astro `PUBLIC_` variable.

Create a non-platform user before assigning a website membership with `npm run user:create -- --email editor@example.com --name "Editor" --password "a-long-unique-password"`. Re-running either user command changes the password and revokes all of that user’s sessions.

The import publishes the current routes and settings. It preserves existing database content unless `--overwrite` is explicitly supplied. Static assets remain in Astro’s `public/assets`; new CMS media is stored in S3 and can be referenced by its public media URL.

## Content and access model

- Platform administrators manage every website and membership.
- Website administrators manage their site, memberships, and API keys.
- Editors manage page/settings drafts, publication, and media only.
- Every tenant-owned query includes `websiteId`; page and media lookups include both the document ID and tenant ID.
- Saving changes updates only `draft`; Publish clones the draft into an independent published snapshot. Unpublish removes it from the API.
- Bearer keys are hashed, bound to one website, limited to `published:read`, and displayed once.

Public API responses are `{ data: ... }`; errors are `{ error: { code, message } }`. Available routes:

```text
GET /api/v1/websites/{slug}/settings
GET /api/v1/websites/{slug}/pages?page=1&limit=50&locale=PT
GET /api/v1/websites/{slug}/pages/{pageSlug}
Authorization: Bearer fcms_...
```

Responses are `private, no-store` and vary by Authorization. Publishing content does not deploy a static Astro site: rebuild and redeploy that site after publication. A Coolify webhook can automate this later.

## S3-compatible storage

Set `S3_ENDPOINT` only for compatible providers; AWS can use its normal endpoint. `S3_PUBLIC_URL` is an independent CDN/public origin and is never inferred from the bucket endpoint. Public objects need read access through that origin. Private objects remain non-public.

Configure bucket CORS for the CMS origin if browser-direct access is later added. The current server upload path itself does not need browser CORS. A suitable future policy allows `GET`/`HEAD` from the public sites and the CMS origin, and does not allow credentialed wildcard origins. Permit the CMS identity only `PutObject`, `GetObject`/`HeadObject`, and `DeleteObject` on the website-prefixed object paths. Uploads are type/size validated, receive server-generated tenant prefixes and random names, and are HEAD-verified before becoming ready.

## Production / Coolify

The Dockerfile builds Next’s standalone output and does not require MongoDB or S3 during the image build. Configure all `.env.example` values in Coolify, generate `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` with `openssl rand -base64 32`, expose port 3000, and route `cms.fortestore.com` to it. Run `admin:create` and `seed:unifato` as one-off commands against production.

Mongoose creates declared indexes on startup. For controlled environments, review/apply the indexes during deployment and disable automatic index creation if required by operations. Back up MongoDB (including users, sessions, drafts, publications, memberships, and key hashes) and the S3 bucket on independent schedules; test point-in-time restoration for both. Neither backup replaces the other.

## Adding a second website

Create it in the platform dashboard, choose a stable unique slug and content type, add members, then create its own API key. In the new Astro repository, reuse the typed client pattern from `website-unifato/src/lib/cms.ts`, configure its CMS URL/slug/key as server-only build variables, validate its own structured page shapes, and fail production builds when published CMS data is unavailable. Never reuse one website’s key for another.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build

cd C:\Users\ForteStore\Documents\GitHub\website-unifato
npm run check
npm run build
```

Unit tests cover session expiry/revocation semantics, password/token hashing, tenant-bound document/media and API-key filters, immutable published snapshots, and upload constraints. Live MongoDB/S3 integration requires test credentials and must not point at production.

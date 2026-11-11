# YACMS

A protected Next.js CMS workspace using shadcn/ui and MongoDB through Mongoose.

## Content model

YACMS is schema-driven. Tenants create their own content types from reusable
field definitions, including relations to other content types. Content is
stored as generic entries rather than domain-specific database models.

Published entries are available through the generic read API. Create a token in
Website settings and send it in the Authorization header:

```text
GET /api/:tenantSlug/content/:contentTypeApiId
Authorization: Bearer <api-token>
```

Connected sites own the adapter that maps a generic response to their local
view models. Domain concepts stay out of the CMS core.

For an Astro site, configure `CMS_URL_API=https://cms.example.com/api/your-slug/content`
and `CMS_API_TOKEN` in its server or build environment, then request
`${CMS_URL_API}/your-content-type` with the bearer header. Regenerating a token
immediately invalidates the previous one. The token is shown only when created.

## Media storage

Set `MEDIA_ENCRYPTION_KEY` to a stable base64 encoded 32 byte random key before
adding an S3 connection. For example, run `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`
and place the result in `.env.local` (or the Compose `.env`). Keep this key
backed up: changing it makes stored S3 credentials unreadable.

Each website configures its own bucket, region, credentials, and optional HTTPS
S3 compatible endpoint on the Media page. Credentials are encrypted in MongoDB.
Files are stored in the configured bucket; the app stores only metadata and
media IDs. Without a connection, media uploads and media field selections are
unavailable. A media field stores the tenant media ID, and the public content
API resolves it to a stable delivery URL. The delivery endpoint redirects to a
short lived signed S3 URL. Deleting a file used by an entry is blocked.

Existing content with path based media values must be uploaded to S3 and
reselected in the content editor. The public API returns `null` for those
legacy values until they are migrated.

Select a connection name on the Media page to browse its bucket. The explorer
lists existing objects and folders, supports uploads, file renaming, downloads,
and creates folder markers. It only deletes empty folders, and it will not
delete an object referenced by a content entry. File renaming uses S3 copy and
delete, so the connection needs list, read, write, and delete permissions.

## Authentication

Accounts and sessions are stored in MongoDB using typed Mongoose models.
Passwords are salted and hashed with Node's `scrypt`. The browser receives an
opaque, HTTP-only session token; only its SHA-256 hash is stored in MongoDB.
Sessions expire automatically using a MongoDB TTL index, and email uniqueness
is enforced by a database index.

## Run with Docker

Copy the example environment file if you want to change the development
credentials or ports:

```bash
cp .env.example .env
```

Build and start the application and MongoDB:

```bash
docker compose up --build
```

The app is available at `http://localhost:3000`. MongoDB is exposed only on
`127.0.0.1:27018` and its data is persisted in the `mongo-data` volume. The
non-default host port avoids collisions with other local MongoDB projects.

Change the example database passwords before using this setup outside local
development. MongoDB initialization variables only apply when the volume is
first created.

## Local development

Start MongoDB, copy `.env.example` to `.env.local`, and run:

```bash
pnpm dev
```

`COOKIE_SECURE` defaults to secure cookies in production. The Compose setup sets
it to `false` because it serves plain HTTP on localhost; set it to `true` behind
HTTPS.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add <component>
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

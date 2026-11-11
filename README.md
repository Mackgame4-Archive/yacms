# YACMS

A protected Next.js CMS workspace using shadcn/ui and MongoDB through Mongoose.

## Content model

YACMS is schema-driven. Tenants create their own content types from reusable
field definitions, including relations to other content types. Content is
stored as generic entries rather than domain-specific database models.

Published entries are available through the generic read API:

```text
GET /api/content/:tenantId/:contentTypeApiId
```

Connected sites own the adapter that maps a generic response to their local
view models. Domain concepts stay out of the CMS core.

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

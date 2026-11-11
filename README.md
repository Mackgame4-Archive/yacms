# Next.js template

This is a Next.js template with shadcn/ui.

## Authentication

The home page is protected by a dependency-free email/password flow. Accounts
are stored locally in `data/users.json`, passwords are salted and hashed with
Node's `scrypt`, and sessions use signed HTTP-only cookies.

For production, set a long random `SESSION_SECRET` environment variable. When
it is omitted, the app creates a local secret in `data/.session-secret`.

The local JSON store is intended for a single persistent Node.js instance. Use
a real database before deploying to serverless or multiple instances.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

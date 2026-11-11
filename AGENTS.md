<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## shadcn/ui

Add shadcn/ui components with:

```bash
npx shadcn@latest add <component>
```

Before using or composing a generated shadcn/ui component, read its matching
official Base UI variant documentation at
`https://ui.shadcn.com/docs/components/base/<component>`. When the component
wraps a Base UI primitive, also check the primitive API at
`https://base-ui.com/react/components/<component>` before writing code.

Follow the documented component hierarchy and composition contract exactly.
In particular, preserve required context wrappers such as menu groups and set
`nativeButton` explicitly when a Base UI `render` prop replaces an element with
a native `<button>`.

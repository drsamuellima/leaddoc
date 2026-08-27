<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# LeadDoc — read and update docs

Before changing product behaviour, read [docs/README.md](docs/README.md) and the page or API file for the area you are touching.

If you add, remove, rename, or change a **page**, **API**, **form handler**, or **user-visible feature**, update the matching file under `docs/` **in the same change**. Write plain English. Do not dump code into the docs.

Map of what to edit: [docs/README.md](docs/README.md#which-file-to-update). After adding or removing a route, run `npm run docs:check`.

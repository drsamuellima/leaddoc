# LeadDoc docs

Plain-English description of **what the product does**, page by page and API by API. Read this before changing behaviour. Keep it in the same change as the code.

How to run the app, env vars, and demo logins: [README.md](../README.md) at the repo root.

How the pieces fit together: [architecture.md](architecture.md).

## How to use these docs

- **New developer or another AI environment:** start here, then [architecture.md](architecture.md), then the page file for the area you are touching.
- **Changing a screen:** update the matching heading in `docs/pages/`.
- **Changing an HTTP endpoint or form handler:** update [apis.md](apis.md).
- **Changing auth, billing, the store, or the widget pipeline:** update [architecture.md](architecture.md) as well.

Write for a person who has never opened the repo. Prefer short sentences. Do not paste large code blocks.

## Keep docs in the same change

If you add, remove, rename, or change the behaviour of a page, API, form handler, or user-visible feature, update the matching file under `docs/` in that same change.

Then run:

```bash
npm run docs:check
```

That script fails if a `page.tsx` or `route.ts` under `src/app` has no heading in these docs. It does not prove the prose is still accurate — you still have to update the words.

## Which file to update

| If you touch | Update |
| --- | --- |
| `src/app/page.tsx`, `src/app/login/**`, `src/app/signup/**` | [pages/public.md](pages/public.md) |
| `src/app/app/**` | [pages/clinic-app.md](pages/clinic-app.md) |
| `src/app/admin/**` | [pages/admin.md](pages/admin.md) |
| `src/app/w/**`, `src/app/widget.js/**`, `src/lib/widget*.ts` | [pages/widget.md](pages/widget.md) |
| `src/app/api/**`, `src/lib/actions.ts` | [apis.md](apis.md) |
| Auth, store, Stripe, embed flow, roles | [architecture.md](architecture.md) |
| New or removed route | This site map, the page/API file, then `npm run docs:check` |

Other AI tools should follow the same contract in [AGENTS.md](../AGENTS.md). In Cursor it is also a project rule.

## Site map

Every heading below must stay as a markdown `##` heading in the linked file (the inventory check looks for that).

### Public

| Route | Doc |
| --- | --- |
| `/` | [pages/public.md](pages/public.md) |
| `/login` | [pages/public.md](pages/public.md) |
| `/signup` | [pages/public.md](pages/public.md) |

### Clinic app

| Route | Doc |
| --- | --- |
| `/app` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/chatbots` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/chatbots/[id]` | [pages/clinic-app.md](pages/clinic-app.md) — chatbot studio: skins, palettes, knowledge edit & add |
| `/app/leads` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/leads/[id]` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/pipelines` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/pipelines/[id]` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/conversations` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/conversations/[id]` | [pages/clinic-app.md](pages/clinic-app.md) |
| `/app/settings` | [pages/clinic-app.md](pages/clinic-app.md) |

### Platform admin

| Route | Doc |
| --- | --- |
| `/admin` | [pages/admin.md](pages/admin.md) |
| `/admin/clinics/new` | [pages/admin.md](pages/admin.md) |
| `/admin/clinics/[id]` | [pages/admin.md](pages/admin.md) |
| `/admin/clinics/[id]/billing` | [pages/admin.md](pages/admin.md) |
| `/admin/clinics/[id]/chatbots` | [pages/admin.md](pages/admin.md) |
| `/admin/clinics/[id]/leads` | [pages/admin.md](pages/admin.md) |
| `/admin/plans` | [pages/admin.md](pages/admin.md) |

### Widget

| Route | Doc |
| --- | --- |
| `/w/[widgetKey]` | [pages/widget.md](pages/widget.md) |
| `/widget.js` | [pages/widget.md](pages/widget.md) |

### APIs

| Route | Doc |
| --- | --- |
| `/api/auth/login` | [apis.md](apis.md) |
| `/api/form/[name]` | [apis.md](apis.md) |
| `/api/widget/lead` | [apis.md](apis.md) |
| `/api/widget/chat` | [apis.md](apis.md) |
| `/api/stripe/webhook` | [apis.md](apis.md) |
| `/api/uploads` | [apis.md](apis.md) |
| `/api/uploads/[filename]` | [apis.md](apis.md) |

# LeadDoc

SaaS for dental practices: branded AI chat widgets, lead CRM, monthly billing, and a platform admin that can manage every clinic.

## Docs

What each page, API, and feature does (plain English): **[docs/README.md](docs/README.md)**. Update those files in the same change as any behaviour edit, then run `npm run docs:check`.

## Run locally

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd /Users/user/Documents/Learning
npm install
cp .env.example .env.local
# keep USE_JSON_STORE=1 for the file-backed demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With `USE_JSON_STORE=1`, data lives in `.data/store.json` (created on first run) and the demo clinic logins are `clinic@dentchat.local` / `admin@dentchat.local` (password `password`).

## Go live (Vercel)

Do not deploy the JSON store. On Vercel:

1. Create a Supabase project. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. Create a public Storage bucket named `avatars`.
2. Use the **transaction pooler** connection string as `DATABASE_URL` (`prepare` is off in the client).
3. Create a Stripe product with a monthly GBP Price. Put the Price id in `STRIPE_PRICE_ID` and/or Admin → Plans. Add a webhook to `https://YOUR_DOMAIN/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.*`.
4. Verify a Resend sending domain. Set `LEAD_FROM_EMAIL` to an address on that domain.
5. Set the env vars below on the Vercel project. **Do not** set `USE_JSON_STORE`.
6. Point `NEXT_PUBLIC_APP_URL` at `https://YOUR_DOMAIN`.

First boot creates the monthly plan and a super-admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if that email is not already in `profiles`.

## Environment

| Variable | Purpose |
| --- | --- |
| `USE_JSON_STORE` | `1` for local file store only. Unset on Vercel. |
| `DATABASE_URL` | Supabase Postgres (transaction pooler). Required when JSON store is off. |
| `SESSION_SECRET` | Signs session cookies. Required in production. |
| `NEXT_PUBLIC_APP_URL` | Public origin for snippets, checkout, and emails |
| `NEXT_PUBLIC_SUPABASE_URL` | Storage uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Storage uploads |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap platform admin on an empty database |
| `GEMINI_API_KEY` | Website scan, setup interview, live widget replies |
| `GEMINI_MODEL` | Gemini model id (default `gemini-3.6-flash`) |
| `STRIPE_SECRET_KEY` | Checkout, portal, admin billing |
| `STRIPE_WEBHOOK_SECRET` | Verifies `/api/stripe/webhook` |
| `STRIPE_PRICE_ID` | Seeded onto the active plan if the plan has no price id yet |
| `RESEND_API_KEY` | Lead, invite, reset, and past-due emails |
| `LEAD_FROM_EMAIL` | From address (must be a verified domain in production) |

Without `USE_JSON_STORE`, missing Stripe or Gemini is an error, not a silent demo success.

## Widget

Clinic staff start on **Chatbots** (`/app/chatbots`). Signup opens `/app/chatbots/[id]/setup`: paste the practice website, scan a few pages, approve FAQs, answer a short AI interview, add a booking link, then go live. After that, **Chatbots → a bot** (`/app/chatbots/[id]`) is the studio.

```html
<script src="https://YOUR_DOMAIN/widget.js" data-widget-key="dc_..." async></script>
```

Visitors must submit name, email, phone, and enquiry before chatting. That creates a lead, stores the transcript, notifies the clinic in-app, and emails the clinic owner.

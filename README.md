# LeadDoc

SaaS for dental practices: branded AI chat widgets, lead CRM, monthly billing, and a platform admin that can manage every clinic.

## Docs

What each page, API, and feature does (plain English): **[docs/README.md](docs/README.md)**. Update those files in the same change as any behaviour edit, then run `npm run docs:check`.

## Run locally

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd /Users/user/Documents/Learning
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo logins (password for both: `password`):

- Clinic: `clinic@dentchat.local`
- Platform admin: `admin@dentchat.local`

Local data lives in `.data/store.json` (created on first run).

## Environment

Copy `.env.example` to `.env.local`. All keys are optional for demo mode.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Origin used in widget snippets |
| `OPENAI_API_KEY` | AI replies (FAQ keyword fallback if unset) |
| `STRIPE_SECRET_KEY` | Checkout, admin customer/subscription, charge card on file |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` |
| `RESEND_API_KEY` | Email on new lead (logs to console if unset) |

Without Stripe, **Subscribe** and admin **Create on Stripe / Charge** activate or simulate locally.

## Supabase (production)

The running app uses the JSON store. SQL for Postgres + RLS is in [`supabase/schema.sql`](supabase/schema.sql). Apply it in the Supabase SQL editor when you switch the data layer to Supabase Auth/Postgres.

## Widget

Clinic staff design the public chat on **Chatbots → a bot** (`/app/chatbots/[id]`). That studio is a dense two-column page: controls on the left, a live preview on the right.

What you can set there:

- **Look** — six skins (orbital, glass, sheet, messenger, dock, pulse). Every skin still does greetings, lead, book, call, and chat. Picking a skin applies a modern colour palette; you can still mix any colours and fonts with any skin.
- **Colour and type** — accent, panel, ink, surface, visitor/bot bubbles, launcher, plus a font (Geist, Instrument Sans, Manrope, Plus Jakarta, Outfit, Sora, DM Sans). Unsaved choices update the preview immediately; **Save chatbot** writes them.
- **Knowledge** — dental FAQ examples you can edit, then **Edit & add**. After a FAQ is on the bot, **Save edits** or **Remove**. Packs import a group you can tweak afterwards. Custom FAQs sit in their own list.
- **Treatments** — buttons for lead (form then AI chat), book (booking URL), or call (practice phone).
- **Embed** — copy the snippet onto the practice website.

Full page write-up: [docs/pages/clinic-app.md](docs/pages/clinic-app.md#appchatbotsid). Widget behaviour: [docs/pages/widget.md](docs/pages/widget.md).

```html
<script src="http://localhost:3000/widget.js" data-widget-key="dc_..." async></script>
```

Visitors must submit name, email, phone, and enquiry before chatting. That creates a lead, stores the transcript, notifies the clinic in-app, and emails the clinic owner.

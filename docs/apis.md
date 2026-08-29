# APIs

HTTP endpoints. Most clinic and admin buttons post HTML forms to `/api/form/[name]`, which runs a named function in `src/lib/actions.ts`. The public widget uses JSON APIs instead.

Related: [architecture.md](architecture.md), [pages/widget.md](pages/widget.md).

## /api/auth/login

**File:** `src/app/api/auth/login/route.ts`  
**Method:** POST (form)  
**Who:** anyone

Checks email and password against `profiles`. Only **wrong password** attempts are rate-limited per IP (not timeouts or server errors). The login form posts with `fetch` and stays on `/login`. Failures return JSON `{ ok: false, code, error }` with HTTP 200 so the page can show a red animated message (including database timeouts). If Postgres does not answer within 8 seconds, login returns that database error instead of waiting for Vercel to kill the function. A 504/502 from the host is also shown as a database timeout, not “invalid email”. GET `/api/auth/login` redirects to `/login`. Admin sign-in uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment if that user is missing in the database. On success, sets a signed `dentchat_session` cookie and the browser goes to `/admin` (super admin) or `/app`.

## /api/form/[name]

**File:** `src/app/api/form/[name]/route.ts`  
**Method:** POST (multipart/form)  
**Who:** depends on the handler (see below)

Looks up `name` in a table of actions. Unknown names return 404 `{ error: "Unknown form" }`. Known names run the action with the posted `FormData` and return `{ ok: true }`. Signup and password-reset names are rate-limited per IP.

Many actions also `redirect()` on success or error, so the browser may follow a redirect instead of reading JSON.

If you add or remove a handler, add or remove its heading in this file.

### signup

Public. Creates a clinic, owner account, a draft chatbot (inactive until they activate it), and a general pipeline, then signs the owner in and sends them to the clinic sign-up wizard, starting with a website scan. Treatment buttons come from the scan and review step. On Postgres this writes those rows directly.

### logout

Clears session and impersonation cookies, then sends the user to login.

### checkout

Signed-in clinic. Starts Stripe Checkout for the active plan. With `USE_JSON_STORE=1` and no Stripe key it can activate locally; production returns an error instead.

### billingPortal

Signed-in clinic with a Stripe customer id. Opens the Stripe Customer Portal to update the card or cancel.

### requestPasswordReset

Public. If the email exists, stores a hashed one-hour token and emails a reset link. Always redirects as if it succeeded.

### resetPassword

Public. Sets a new password from a valid token.

### saveChatbot

Clinic. Saves studio fields: name, greetings, prompt, colours, skin, font, avatar, phone, booking URL, active flag.

### createChatbot

Clinic. Creates a draft chatbot (inactive, setup incomplete) and sends the clinic to `/app/chatbots/[id]/setup`.

### deleteChatbot

Clinic. Deletes a chatbot the clinic owns, plus its FAQs and treatment buttons. Patient leads are kept. Redirects to `/app/chatbots?ok=deleted`.

### addOption

Clinic. Adds a treatment button on the widget (label, starter message, lead / book / call, optional URL).

### updateOption

Clinic. Edits an existing treatment button.

### deleteOption

Clinic. Removes a treatment button.

### addKnowledge

Clinic. Adds one FAQ item (title, question, answer) used by the AI. Clinics can change the example text first, then submit.

### addKnowledgePack

Clinic. Imports a pre-built FAQ pack from `src/lib/knowledge-examples.ts` (practice hours, treatments, and similar). Items can be edited afterwards.

### updateKnowledge

Clinic. Changes the title, question, and answer of an existing FAQ.

### deleteKnowledge

Clinic. Removes a FAQ item.

### saveBranding

Clinic. Updates organisation name, colours, logo, welcome image, phone, and booking URL.

### inviteStaff

Clinic owner or admin. Adds a `clinic_staff` profile to this organisation. Emails a temporary password (generated if the form left it blank).

### updateLead

Clinic. Saves lead fields: status, assignee, pipeline/stage, treatment, value, follow-up, notes, contact details.

### createLeadTask

Clinic. Adds a follow-up task on a lead.

### completeLeadTask

Clinic. Marks a follow-up task done.

### deleteLeads

Clinic. Deletes one or more leads (and related CRM rows as the action defines).

### patchLeadInline

Clinic. Saves a single field from the leads table without opening the record.

### createPipeline

Clinic. Creates a treatment pipeline with default stages.

### updatePipeline

Clinic. Renames a pipeline.

### addPipelineStage

Clinic. Adds a stage to a pipeline.

### updatePipelineStage

Clinic. Renames a stage.

### deletePipelineStage

Clinic. Removes a stage.

### deletePipeline

Clinic. Deletes a pipeline and moves its leads onto another treatment.

### addLeadNote

Clinic. Adds a note on a lead.

### addLeadRecall

Clinic. Adds a recall reminder with a due date.

### completeLeadRecall

Clinic. Marks a recall done.

### markNotificationsRead

Clinic. Marks in-app notifications as read.

### adminCreateClinic

Platform admin. Creates a practice the same way as public signup: owner, draft chatbot, and a general pipeline. Duplicate emails fail.

### impersonate

Platform admin. Sets `dentchat_impersonate_org` and redirects into `/app` (or a `next` path that starts with `/app`, such as a chatbot studio or lead record). Writes a small audit row; it does not rewrite the whole database. If the clinic id is missing, returns to `/admin`.

### exitImpersonate

Platform admin. Clears impersonation and returns to `/admin`.

### adminLinkStripe

Platform admin. Stores a Stripe customer id on the organisation.

### adminCreateStripeSub

Platform admin. Creates a Stripe subscription. With `USE_JSON_STORE=1` and no Stripe key it can simulate; production does not.

### adminCharge

Platform admin. Charges the card on file. Same demo-only simulation rule as create subscription.

### adminSavePlan

Platform admin. Updates the monthly plan (name, pence, Stripe price id, active).

### adminAddSupportNote

Platform admin. Adds an internal note on a clinic. Clinics never see these.

### adminToggleWidgetException

Platform admin. Turns `allowWidgetWithoutSub` on or off so the embed can run without a paid subscription.

### adminCreateChatbot

Platform admin. Creates a chatbot for a chosen clinic. With `ready=draft` (or omitted as draft via the hub form) it is an inactive setup wizard bot; otherwise it is a finished bot with default treatment buttons. Then impersonates into setup or the studio.

### adminDeleteChatbot

Platform admin. Deletes a chatbot for a chosen clinic (same records as `deleteChatbot`) and returns to that clinic’s chatbot list.

### adminSetSubscription

Platform admin. Sets a clinic’s `subscriptionStatus` and `allowWidgetWithoutSub` without going through Stripe.

### adminSaveBranding

Platform admin. Updates a clinic’s name, colour, logo, welcome photo, phone, and booking URL (the same fields as clinic Settings).

### adminInviteStaff

Platform admin. Adds a `clinic_staff` login to a chosen clinic. Same rules as `inviteStaff` (email must be new).

### adminDeleteClinic

Platform admin. Removes a practice and its staff, bots, leads, and related records after typing DELETE.

### adminResetUserPassword

Platform admin. Sets a new password (8+ characters) for any profile.

## POST /api/chatbots/[id]/scan

**File:** `src/app/api/chatbots/[id]/scan/route.ts`  
**Method:** POST (JSON)  
**Who:** signed-in clinic that owns this bot

Body: `{ url }`. Fetches the practice homepage and a few linked key pages, then extracts name, phone, booking URL, greetings, prompt, services/treatments, and FAQs (Gemini when `GEMINI_API_KEY` is set; otherwise page heuristics). Practice name, phone, and booking URL are taken from the site only; if they are missing they are stored blank (the homepage is not treated as a booking page). Services are named treatments listed on the site. Stores a pending extract on the bot and copies name, phone, and booking onto the bot when found. Does not write FAQs or treatment buttons until the clinic approves them in setup.

Rejects non-http(s) URLs, localhost, and private IPs. Returns the updated bot payload, or 400 with an error message.

**Writes:** `chatbots.setup`.

## PATCH /api/chatbots/[id]/setup

**File:** `src/app/api/chatbots/[id]/setup/route.ts`  
**Method:** PATCH (JSON)  
**Who:** signed-in clinic that owns this bot

Autosave for the setup wizard. Can patch step, website URL, name, phone, booking URL, greetings, pending FAQs, pending services, **approve knowledge** (writes FAQs and service buttons, and fills extracted fields), **enter clinic** (marks setup complete and is followed by `/app` in the browser), or **go live** (sets `active` and `setupComplete`).

**Writes:** `chatbots`, sometimes `knowledgeItems` and `chatbotOptions`.

## POST /api/chatbots/[id]/setup-chat

**File:** `src/app/api/chatbots/[id]/setup-chat/route.ts`  
**Method:** POST (JSON)  
**Who:** signed-in clinic that owns this bot

One interview turn. Body: `{ start: true }` to open the thread, `{ message }` for a typed reply, or `{ confirm: { field, accepted } }` for a green tick / red cross on a value we already have (name, phone, booking, treatments). Known details are shown for confirm first. After that the assistant only asks for remaining gaps (phone and booking stay on the next card). Parsed facts are patched onto the bot immediately. When the interview is finished, the response includes `advanceToBooking: true` so the wizard can open Booking.

**Writes:** `chatbots`, sometimes `knowledgeItems` and `chatbotOptions`.

## /api/widget/lead

**File:** `src/app/api/widget/lead/route.ts`  
**Method:** POST (JSON)  
**Who:** public, widget key required

First step of a visitor chat. Body: `widgetKey`, `name`, `email`, `phone`, `inquiry`. All four contact fields are required.

Validates the widget exists and the clinic is allowed to serve chat. Then:

- Loads FAQs for that bot only (not the whole database).
- Picks a treatment pipeline from the enquiry text when possible.
- Creates a lead (status `new`), a conversation, user + assistant messages, and an in-app notification.
- Emails the clinic owner if Resend is configured (otherwise logs to the console).
- Returns the AI reply and ids the widget needs to keep chatting.

Errors: 400 missing fields, 404 unknown widget, 402 chat unavailable (billing).

**Writes:** `leads`, `conversations`, `messages`, `notifications`.

## /api/widget/chat

**File:** `src/app/api/widget/chat/route.ts`  
**Method:** POST (JSON)  
**Who:** public, widget key + existing conversation

Later messages. Body: `widgetKey`, `conversationId`, `content`. Loads that conversation’s transcript and the bot’s FAQs, then stores the visitor line and the AI reply. Same widget-allowed check as lead capture.

**Writes:** `messages`.

## /api/stripe/webhook

**File:** `src/app/api/stripe/webhook/route.ts`  
**Method:** POST (JSON)  
**Who:** Stripe (or a local test client)

Updates an organisation when Checkout or a subscription changes: Stripe customer id, subscription id, and `subscriptionStatus`. Matches the clinic by `client_reference_id` / `metadata.organization_id` or existing customer id. The `Stripe-Signature` header is checked against `STRIPE_WEBHOOK_SECRET` (required in production). If status becomes `past_due`, the clinic owner is emailed.

Unknown payloads with no ids are acknowledged without a store write.

**Writes:** `organizations`.

## /api/uploads

**File:** `src/app/api/uploads/route.ts`  
**Method:** POST (multipart)  
**Who:** signed-in user with an active clinic (including impersonation)

Uploads a JPEG avatar for a chatbot (max 1.5 MB). The bot must belong to the active organisation. Returns a public URL (Supabase Storage when configured, otherwise `/api/uploads/[filename]`).

## /api/uploads/[filename]

**File:** `src/app/api/uploads/[filename]/route.ts`  
**Method:** GET  
**Who:** anyone with the URL (widget and studio need this)

Serves a stored JPEG, or redirects to the public Storage URL. Rejects unsafe filenames. Long cache headers.

The embed script is `GET /widget.js` — documented in [pages/widget.md](pages/widget.md#widgetjs).

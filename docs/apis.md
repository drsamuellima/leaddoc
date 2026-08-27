# APIs

HTTP endpoints. Most clinic and admin buttons post HTML forms to `/api/form/[name]`, which runs a named function in `src/lib/actions.ts`. The public widget uses JSON APIs instead.

Related: [architecture.md](architecture.md), [pages/widget.md](pages/widget.md).

## /api/auth/login

**File:** `src/app/api/auth/login/route.ts`  
**Method:** POST (form)  
**Who:** anyone

Checks email and password against `profiles`. On failure, redirects to `/login?error=invalid`. On success, sets `dentchat_session` and redirects super admins to `/admin` and everyone else to `/app`.

## /api/form/[name]

**File:** `src/app/api/form/[name]/route.ts`  
**Method:** POST (multipart/form)  
**Who:** depends on the handler (see below)

Looks up `name` in a table of actions. Unknown names return 404 `{ error: "Unknown form" }`. Known names run the action with the posted `FormData` and return `{ ok: true }`.

Many actions also `redirect()` on success or error, so the browser may follow a redirect instead of reading JSON.

If you add or remove a handler, add or remove its heading in this file.

### signup

Public. Creates a clinic, owner account, default chatbot, and default pipelines, then signs the owner in.

### logout

Clears session and impersonation cookies, then sends the user to login.

### checkout

Signed-in clinic. Starts Stripe Checkout for the active plan, or activates the subscription locally if Stripe is not configured.

### saveChatbot

Clinic. Saves studio fields: name, greetings, prompt, colours, skin, font, avatar, phone, booking URL, active flag.

### createChatbot

Clinic. Creates a draft chatbot (inactive, setup incomplete) and sends the clinic to `/app/chatbots/[id]/setup`.

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

Clinic owner or admin. Adds a `clinic_staff` profile to this organisation.

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

Platform admin. Creates a practice and owner, same idea as signup.

### impersonate

Platform admin. Sets `dentchat_impersonate_org` and redirects to `/app`.

### exitImpersonate

Platform admin. Clears impersonation and returns to `/admin`.

### adminLinkStripe

Platform admin. Stores a Stripe customer id on the organisation.

### adminCreateStripeSub

Platform admin. Creates a Stripe subscription (or simulates it).

### adminCharge

Platform admin. Charges the card on file (or simulates it).

### adminSavePlan

Platform admin. Updates the monthly plan (name, pence, Stripe price id, active).

### adminAddSupportNote

Platform admin. Adds an internal note on a clinic. Clinics never see these.

### adminToggleWidgetException

Platform admin. Turns `allowWidgetWithoutSub` on or off so the embed can run without a paid subscription.

### adminCreateChatbot

Platform admin. Creates a finished chatbot for a chosen clinic (setup already complete) and impersonates into the studio.

## POST /api/chatbots/[id]/scan

**File:** `src/app/api/chatbots/[id]/scan/route.ts`  
**Method:** POST (JSON)  
**Who:** signed-in clinic that owns this bot

Body: `{ url }`. Fetches the practice homepage and a few linked key pages, then extracts name, phone, booking URL, greetings, prompt, treatments, and FAQs (OpenAI when `OPENAI_API_KEY` is set; otherwise heuristics plus the FAQ catalog). Stores a pending extract on the bot. Does not write FAQs until the clinic approves them in setup.

Rejects non-http(s) URLs, localhost, and private IPs. Returns the updated bot payload, or 400 with an error message.

**Writes:** `chatbots.setup`.

## PATCH /api/chatbots/[id]/setup

**File:** `src/app/api/chatbots/[id]/setup/route.ts`  
**Method:** PATCH (JSON)  
**Who:** signed-in clinic that owns this bot

Autosave for the setup wizard. Can patch step, website URL, name, phone, booking URL, greetings, pending FAQs, **approve knowledge** (writes FAQs and fills extracted fields), or **go live** (sets `active` and `setupComplete`).

**Writes:** `chatbots`, sometimes `knowledgeItems` and `chatbotOptions`.

## POST /api/chatbots/[id]/setup-chat

**File:** `src/app/api/chatbots/[id]/setup-chat/route.ts`  
**Method:** POST (JSON)  
**Who:** signed-in clinic that owns this bot

One interview turn. Body: `{ start: true }` to open the thread, or `{ message }` for a reply. The assistant only asks for checklist gaps. Parsed facts are patched onto the bot immediately.

**Writes:** `chatbots`, sometimes `knowledgeItems` and `chatbotOptions`.

## /api/widget/lead

**File:** `src/app/api/widget/lead/route.ts`  
**Method:** POST (JSON)  
**Who:** public, widget key required

First step of a visitor chat. Body: `widgetKey`, `name`, `email`, `phone`, `inquiry`. All four contact fields are required.

Validates the widget exists and the clinic is allowed to serve chat. Then:

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

Later messages. Body: `widgetKey`, `conversationId`, `content`. Stores the visitor line and the AI reply. Same widget-allowed check as lead capture.

**Writes:** `messages`.

## /api/stripe/webhook

**File:** `src/app/api/stripe/webhook/route.ts`  
**Method:** POST (JSON)  
**Who:** Stripe (or a local test client)

Updates an organisation when Checkout or a subscription changes: Stripe customer id, subscription id, and `subscriptionStatus`. Matches the clinic by `client_reference_id` / `metadata.organization_id` or existing customer id.

Unknown payloads with no ids are acknowledged without a store write.

**Writes:** `organizations`.

## /api/uploads

**File:** `src/app/api/uploads/route.ts`  
**Method:** POST (multipart)  
**Who:** signed-in user with an active clinic (including impersonation)

Uploads a JPEG avatar for a chatbot (max 1.5 MB). The bot must belong to the active organisation. Returns a public URL under `/api/uploads/[filename]`.

## /api/uploads/[filename]

**File:** `src/app/api/uploads/[filename]/route.ts`  
**Method:** GET  
**Who:** anyone with the URL (widget and studio need this)

Serves a stored JPEG from `.data/uploads/`. Rejects unsafe filenames. Long cache headers.

The embed script is `GET /widget.js` — documented in [pages/widget.md](pages/widget.md#widgetjs).

# Clinic app

Everything under `/app` is the practice workspace. The layout (`src/app/app/layout.tsx`) requires a signed-in user with a clinic (`getClinicContext`). Super admins only get here by impersonating a clinic.

Nav: Overview, Chatbots, Leads, Pipelines, Conversations, Settings. The shell can search patients (submits to `/app/leads`) and shows unread “new lead” notifications.

Related: [architecture.md](../architecture.md), [widget.md](widget.md), [apis.md](../apis.md).

## /app

**File:** `src/app/app/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

The practice overview. It shows how many leads the clinic has captured, a 14-day trend, a breakdown by lead status (new / contacted / booked / closed), latest leads, chatbot count, conversation count, unread notifications, and subscription status.

**Reads:** `leads`, `chatbots`, `conversations`, `notifications` for this organisation. Does not write.

**Related:** [/app/leads](#appleads), [/app/chatbots](#appchatbots)

## /app/chatbots

**File:** `src/app/app/chatbots/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Lists this practice’s chatbots as cards (name, greeting, widget key, active/inactive). **Set up with AI** creates a draft bot (`POST /api/form/createChatbot`) and opens the beginner wizard. Incomplete drafts show **Continue setup**. Finished bots open the studio.

**Reads/writes:** reads `chatbots`; create writes an inactive draft chatbot with a generated widget key and `setupComplete: false`.

**Related:** [/app/chatbots/[id]/setup](#appchatbotsidsetup), [/app/chatbots/[id]](#appchatbotsid)

## /app/chatbots/[id]/setup

**File:** `src/app/app/chatbots/[id]/setup/page.tsx` (UI: `src/components/chatbot-setup/wizard.tsx`)  
**Who:** clinic owner, clinic staff, impersonating admin (must own this bot)

AI-guided setup for a new chatbot. Progress bar plus a checklist (website scanned, knowledge approved, name, phone, booking link, greetings, treatment buttons, system prompt). Cards: Website → Review knowledge → Finish with AI → Booking → Go live. Completed cards can be reopened; later cards stay locked until the previous work is done (knowledge is required before interview, booking, and go live). Every field, scan, approval, and chat turn auto-saves (`PATCH /api/chatbots/[id]/setup`). There is no Save button.

**Website.** Paste an `http`/`https` URL and **Scan**. The server fetches the homepage and a few same-site pages (About, Contact, Treatments, Hours, and similar). Localhost and private IPs are blocked. OpenAI (when configured) returns a structured draft; otherwise heuristics plus the dental FAQ catalog. Results sit as pending extract until approval.

**Review knowledge.** Editable FAQ list plus name, phone, and booking if we found them. **Approve knowledge** writes FAQs onto the bot and fills those fields.

**Finish with AI.** A short interview that only asks what the checklist still lacks. Each reply is parsed and patched onto the bot (`POST /api/chatbots/[id]/setup-chat`).

**Booking.** Dedicated form for a Dentally (or other) booking URL and the practice phone.

**Go live.** Activates the widget, marks setup complete, copies the embed snippet, and opens the studio.

Unknown ids return 404. Incomplete bots that open `/app/chatbots/[id]` are sent here.

**Reads/writes:** `chatbots`, `chatbotOptions`, `knowledgeItems`.

**Related:** [scan](../apis.md#post-apichatbotsidscan), [setup](../apis.md#patch-apichatbotsidsetup), [setup-chat](../apis.md#post-apichatbotsidsetup-chat)

## /app/chatbots/[id]

**File:** `src/app/app/chatbots/[id]/page.tsx` (UI: `src/components/chatbot-studio/studio.tsx`)  
**Who:** clinic owner, clinic staff, impersonating admin (must own this bot)

The chatbot studio. Dense two-column layout: editors on the left, sticky live preview on the right. This is where a practice designs the public widget after the AI setup wizard (or when opening a finished bot). Drafts that are not yet complete redirect to [setup](#appchatbotsidsetup).

**Look.** Six skins — orbital, glass, sheet, messenger, dock, pulse. They share the same actions (greetings, lead, book, call, chat) and only change chrome. Each skin has a modern suggested palette (accent, panel, ink, surface, visitor bubble, bot bubble, launcher) shown as colour dots. Choosing a skin applies that palette; colour and font fields stay editable so any combination is valid.

**Colour and type.** Round swatches plus hex fields. Fonts load in the widget iframe (Geist, Instrument Sans, Manrope, Plus Jakarta, Outfit, Sora, DM Sans). Unsaved tokens are sent to the preview as query params. **Save chatbot** persists skin, font, colours, name, prompt, avatar, greetings, phone, booking URL, and the live flag.

**Identity and voice.** Name, live toggle, avatar name and crop, system prompt, greeting lines (one line = one bubble).

**Connect.** Clinic phone (Call buttons) and booking URL (Book buttons). Blank uses Settings.

**Actions.** Treatment buttons: lead (enquiry form then AI chat), book (open URL), call (dial). Same buttons on every skin; only the layout changes.

**Knowledge.** Example FAQs are grouped (practice, patients, treatments, fees). Each example is an editable title, question, and answer. **Edit & add** saves the (possibly changed) text. After it is on the bot, the same card becomes **Save edits** plus **Remove**. Packs import a whole group. FAQs that no longer match a catalog example (or were written from scratch) appear under Custom FAQs, also editable. The AI uses these items when it replies.

**Embed.** Snippet and widget key for WordPress or any site footer.

The preview iframe is `/w/{widgetKey}?preview=1` (inactive bots still preview). Avatar JPEG upload goes to `POST /api/uploads`. Unknown ids return 404.

**Reads/writes:** `chatbots`, `chatbotOptions`, `knowledgeItems`; upload files under `.data/uploads/`.

**Related:** [widget](widget.md), [saveChatbot](../apis.md#savechatbot), [updateKnowledge](../apis.md#updateknowledge)

## /app/leads

**File:** `src/app/app/leads/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

The patient lead list (CRM). Staff can search (name, email, and similar), filter by pipeline or assignee, page through rows, and edit some fields in the table without opening the record.

Inline edits go through `patchLeadInline`. Bulk delete uses `deleteLeads`. Opening a name goes to the lead record.

**Reads/writes:** `leads`, `pipelines`, `profiles` for this organisation.

**Related:** [/app/leads/[id]](#appleadsid)

## /app/leads/[id]

**File:** `src/app/app/leads/[id]/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin (lead must belong to this clinic)

The full lead record. Tabs:

- **Enquiry** — contact details, treatment, pipeline stage, value, status, assignee.
- **Activity** — timeline of events on this lead.
- **Notes** — free-text notes (`addLeadNote`).
- **Recalls** — dated recall reminders (`addLeadRecall`, `completeLeadRecall`).
- **Chat** — the widget transcript for this lead (read-only).
- **Follow-ups** — tasks with due dates (`createLeadTask`, `completeLeadTask`).

Staff can update status, assignment, pipeline stage, and other fields (`updateLead`), call the patient (tel: link), or delete the lead.

Unknown or other-clinic ids return 404.

**Reads/writes:** `leads`, `messages`, `leadTasks`, `leadNotes`, `leadRecalls`, `leadEvents`, `pipelines`, `profiles`.

**Related:** [/app/conversations/[id]](#appconversationsid)

## /app/pipelines

**File:** `src/app/app/pipelines/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Treatment pipelines. Each pipeline is a named treatment (for example Whitening) with ordered stages. This page lists pipelines, how many stages and leads each has, lets staff create one, and lets them delete one (leads are moved to another treatment).

Create currently posts a server action (`createPipelineAction`) rather than `/api/form/createPipeline`; both exist and should stay equivalent.

**Reads/writes:** `pipelines`, lead counts.

**Related:** [/app/pipelines/[id]](#apppipelinesid)

## /app/pipelines/[id]

**File:** `src/app/app/pipelines/[id]/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin (pipeline must belong to this clinic)

Edit one pipeline: rename the treatment, add stages, rename stages, remove stages.

**Reads/writes:** that `pipeline` and its stages. Form handlers: `updatePipeline`, `addPipelineStage`, `updatePipelineStage`, `deletePipelineStage`.

## /app/conversations

**File:** `src/app/app/conversations/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Inbox of visitor chats for this practice, newest first. Each row shows the linked lead’s name and enquiry when details were captured.

**Reads:** `conversations`, `leads`. Does not write.

**Related:** [/app/conversations/[id]](#appconversationsid)

## /app/conversations/[id]

**File:** `src/app/app/conversations/[id]/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Read-only transcript of one chat. If a lead is attached, there is a link to that lead record. Clinic staff do not reply from here; replies happen in the public widget.

**Reads:** `conversations`, `messages`, `leads`.

## /app/settings

**File:** `src/app/app/settings/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Practice settings in three blocks:

- **Branding** — practice name, primary colour, logo URL, welcome photo URL, phone (used by Call on the widget), Dentally/booking URL (used by Book unless a treatment overrides it). Saved with `saveBranding`.
- **Billing** — current subscription status and a **Subscribe monthly** button (`checkout`). Without Stripe keys this activates locally.
- **Team** — list of people on this clinic; add staff with name, email, and a temporary password (`inviteStaff`). Owners (and admins) can invite; clinic staff cannot.

**Reads/writes:** `organizations`, `profiles`; checkout may talk to Stripe.

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

Lists this practice’s chatbots as cards (name, greeting, widget key, active/inactive). A small form creates a new bot (`POST /api/form/createChatbot`). Click a card to open the studio.

**Reads/writes:** reads `chatbots`; create writes a new chatbot with a generated widget key.

**Related:** [/app/chatbots/[id]](#appchatbotsid)

## /app/chatbots/[id]

**File:** `src/app/app/chatbots/[id]/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin (must own this bot)

The chatbot studio. This is where a practice designs the public widget: skins, colours, fonts, avatar photo, greetings, treatment buttons (lead / book / call), FAQ knowledge (including one-click packs), system prompt, and the embed snippet.

A live preview iframe loads `/w/{widgetKey}?preview=1` so appearance can be tried before save. Saving posts to `saveChatbot` and related form handlers for options and knowledge. Avatar JPEG upload goes to `POST /api/uploads`.

Unknown ids return 404.

**Reads/writes:** `chatbots`, `chatbotOptions`, `knowledgeItems`; upload files under `.data/uploads/`.

**Related:** [widget](widget.md), [saveChatbot](../apis.md#savechatbot)

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

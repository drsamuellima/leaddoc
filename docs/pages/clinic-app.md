# Clinic app

Everything under `/app` is the practice workspace. The layout (`src/app/app/layout.tsx`) requires a signed-in user with a clinic (`getClinicContext`). Super admins only get here by impersonating a clinic. The layout only loads an unread-notification count. Each page then loads the tables it needs (not every chat message and FAQ). Clicking a sidebar item highlights it immediately; the main canvas shows a short skeleton until that page arrives.

Nav: Overview, Chatbots, Leads, Pipelines, Conversations, Settings. The shell can search patients (submits to `/app/leads`) and shows unread “new lead” notifications. The dark sidebar uses the official LeadDr. wordmark (dark-background version) plus the practice name. The main canvas — search bar and page together — shares one cream background with the same soft colour wash, so the header is not a separate white strip.

Related: [architecture.md](../architecture.md), [widget.md](widget.md), [apis.md](../apis.md).

## /app

**File:** `src/app/app/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

The practice overview. It shows how many leads the clinic has captured, a 14-day trend, a breakdown by lead status (new / contacted / booked / closed), latest leads, chatbot count, conversation count, unread notifications, and subscription status.

**Reads:** `leads`, `chatbots`, `conversations`, `notifications` for this organisation (same clinic load as the layout, not a second full fetch). Does not write.

**Related:** [/app/leads](#appleads), [/app/chatbots](#appchatbots)

## /app/chatbots

**File:** `src/app/app/chatbots/page.tsx`  
**Who:** clinic owner, clinic staff, impersonating admin

Lists this practice’s chatbots as cards (name, greeting, widget key, active/inactive). **Set up with AI** creates a draft bot (`POST /api/form/createChatbot`) and opens the beginner wizard. Incomplete drafts show **Continue setup**. Finished bots open the studio. **Delete** on a card (after confirm) removes the bot, its FAQs, and treatment buttons. Patient leads stay. The embed snippet for that widget key stops working.

**Reads/writes:** reads `chatbots`; create writes an inactive draft; delete removes the bot (`POST /api/form/deleteChatbot`).

**Related:** [/app/chatbots/[id]/setup](#appchatbotsidsetup), [/app/chatbots/[id]](#appchatbotsid)

## /app/chatbots/[id]/setup

**File:** `src/app/app/chatbots/[id]/setup/page.tsx` (UI: `src/components/chatbot-setup/wizard.tsx`)  
**Who:** clinic owner, clinic staff, impersonating admin (must own this bot)

AI-guided clinic sign-up for a new chatbot. Glass cards, numbered step rail, progress, and a checklist (website scanned, knowledge approved, name, phone, booking link, greetings, treatment buttons, system prompt). Cards: Website scan → Review knowledge → Finish setup → Booking → Open clinic. Website scan is always open. Later cards stay locked until the previous work is done (knowledge is required before interview, booking, and open clinic). Every field, scan, approval, and chat turn auto-saves (`PATCH /api/chatbots/[id]/setup`). There is no Save button.

**Website scan.** Paste an `http`/`https` URL and **Scan**. The server fetches the homepage and a few same-site pages (About, Contact, Treatments, Hours, and similar). Localhost and private IPs are blocked. Gemini (when `GEMINI_API_KEY` is in `.env.local`) returns a structured draft. If the key is missing, the page shows a warning and we fall back to heuristics plus the dental FAQ catalog. If the key is set but Gemini fails, the scan returns that error instead of pretending it worked.

**Review knowledge.** Organised into Practice, Services, From the website, and Suggested extras. A summary shows how many practice fields, services, and answers were found, plus pills for name, phone, and booking. After a scan, Gemini fills name, phone, and booking from the pages when they are clearly there; otherwise those stay blank. Services are the treatments the site actually lists — not a generic catalogue — and become widget buttons (Chat, Book, or Call). The homepage is not used as a booking link. Site answers and suggested extras are edited separately. **Approve knowledge** writes FAQs and service buttons onto the bot.

**Finish setup.** If name, phone, booking, or services were already approved, the chat shows each value and asks for a green tick or red cross — it does not ask you to type them again. A cross clears that field and asks for the right value. After confirms, it only asks follow-ups that are still missing (welcome line, NHS/hours, and similar). When that chat is finished, Booking opens on its own after a short pause. Turns save through `POST /api/chatbots/[id]/setup-chat`.

**Booking.** Dedicated form for a Dentally (or other) booking URL and the practice phone.

**Go live / Open clinic.** Marks setup complete and opens the clinic workspace (`/app`). **Activate widget** also turns the public chat on. The embed snippet can be copied here or later from the studio.

Unknown ids return 404. Incomplete bots that open `/app/chatbots/[id]` are sent here. **Delete draft** removes the bot the same way as the list page.

**Reads/writes:** `chatbots`, `chatbotOptions`, `knowledgeItems`.

**Related:** [scan](../apis.md#post-apichatbotsidscan), [setup](../apis.md#patch-apichatbotsidsetup), [setup-chat](../apis.md#post-apichatbotsidsetup-chat)

## /app/chatbots/[id]

**File:** `src/app/app/chatbots/[id]/page.tsx` (UI: `src/components/chatbot-studio/studio.tsx`)  
**Who:** clinic owner, clinic staff, impersonating admin (must own this bot)

The chatbot studio. Two-column layout: editors on the left with a sticky save bar, live preview in a framed card on the right. Glass panels, numbered sections, and the same motion language as the setup wizard. This is where a practice designs the public widget after the AI setup wizard (or when opening a finished bot). Drafts that are not yet complete redirect to [setup](#appchatbotsidsetup).

**Look.** Six skins — orbital, glass, sheet, messenger, dock, pulse. They share the same actions (greetings, lead, book, call, chat) and only change chrome. Each skin has a modern suggested palette (accent, panel, ink, surface, visitor bubble, bot bubble, launcher) shown as colour dots. Choosing a skin applies that palette; colour and font fields stay editable so any combination is valid.

**Colour and type.** Round swatches plus hex fields. Fonts load in the widget iframe (Geist, Instrument Sans, Manrope, Plus Jakarta, Outfit, Sora, DM Sans). Unsaved tokens are sent to the preview as query params. **Save chatbot** persists skin, font, colours, name, prompt, avatar, greetings, phone, booking URL, and the live flag.

**Identity and voice.** Name, live toggle, avatar name and crop, system prompt, greeting lines (one line = one bubble).

**Connect.** Clinic phone (Call buttons) and booking URL (Book buttons). Blank uses Settings.

**Actions.** Treatment buttons: lead (enquiry form then AI chat), book (open URL), call (dial). Same buttons on every skin; only the layout changes.

**Knowledge.** Example FAQs are grouped (practice, patients, treatments, fees). Each example is an editable title, question, and answer. **Edit & add** saves the (possibly changed) text. After it is on the bot, the same card becomes **Save edits** plus **Remove**. Packs import a whole group. FAQs that no longer match a catalog example (or were written from scratch) appear under Custom FAQs, also editable. The AI uses these items when it replies.

**Embed.** Snippet and widget key for WordPress or any site footer.

**Delete.** Confirms, then removes the bot, FAQs, and treatment buttons (`deleteChatbot`). Leads stay. Returns to the chatbot list.

The preview iframe is `/w/{widgetKey}?preview=1` (inactive bots still preview). Avatar JPEG upload goes to `POST /api/uploads`. Unknown ids return 404.

**Reads/writes:** `chatbots`, `chatbotOptions`, `knowledgeItems`; avatar JPEGs go to Storage (or `.data/uploads/` in local JSON demo).

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

The full lead record. Tabs (switch in the browser; the URL updates without reloading the page):

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
- **Billing** — subscription panel (status, monthly price, widget access), **Subscribe monthly** (`checkout`), and **Manage billing** (`billingPortal`) when a Stripe customer already exists.
- **Team** — list of people on this clinic; add staff with name, email, and an optional temporary password (`inviteStaff`). A password is generated and emailed if left blank. Owners (and admins) can invite; clinic staff cannot.

**Reads/writes:** `organizations`, `profiles`; checkout may talk to Stripe.

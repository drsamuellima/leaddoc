# Platform admin

Everything under `/admin` is for **super_admin** only. The layout (`src/app/admin/layout.tsx`) calls `requireAdmin()`; other roles are sent to `/app`.

Nav: Clinics, All leads, Users, Plans, Activity, Add clinic. Search on the shell filters the clinic directory. The dark sidebar uses the official LeadDr. wordmark (dark-background version) plus “Platform admin”. Sidebar clicks highlight immediately and the main canvas shows a short skeleton until that page arrives.

Admins can **Open as clinic**. That posts to impersonate, which sets `dentchat_impersonate_org` on the 303 redirect and sends them into **`/app`** — the same clinic dashboard the practice uses (chatbots, CRM, pipelines, settings). Optional `next` stays under `/app`. The clinic shell shows an impersonation banner; **Exit clinic** clears the cookie on the redirect back to `/admin`. Do not copy clinic screens under `/admin`; change `/app` once and both roles see it.

Admin list pages (all leads, users, activity, plans) load targeted queries. Opening one clinic loads that practice only (`readClinicStore`), not every clinic at once. That keeps the admin shell from dying mid-navigation (the minified React “connection closed” error).

Related: [architecture.md](../architecture.md), [clinic-app.md](clinic-app.md), [apis.md](../apis.md).

## /admin

**File:** `src/app/admin/page.tsx`  
**Who:** platform admin

Directory of every practice, plus connection pills (database, Stripe, Gemini, email). Search by name (`?q=`). Each row shows subscription status and lead count. Actions: **Open** (clinic hub) and **Open as clinic** (impersonate into `/app`).

**Reads:** organisations and lead counts (not the full store). Impersonate writes the impersonation cookie.

**Related:** [/admin/clinics/[id]](#adminclinicsid), [impersonate](../apis.md#impersonate)

## /admin/leads

**File:** `src/app/admin/leads/page.tsx`  
**Who:** platform admin

Every lead across every clinic (newest first, up to 500). Jump to the clinic hub or **Open record** to impersonate into that lead in the clinic CRM.

**Reads:** `leads` with clinic names.

## /admin/users

**File:** `src/app/admin/users/page.tsx`  
**Who:** platform admin

Every login (platform admin, clinic owner, staff). Reset any password with `adminResetUserPassword`.

**Reads/writes:** `profiles`.

## /admin/audit

**File:** `src/app/admin/audit/page.tsx`  
**Who:** platform admin

Audit log of impersonation, billing, password resets, and other admin actions.

**Reads:** `auditLogs` (latest 200) with actor email and clinic name.

## /admin/clinics/new

**File:** `src/app/admin/clinics/new/page.tsx`  
**Who:** platform admin

Manually create a practice: owner name, email, temporary password (required, 8+ characters). Posts to `adminCreateClinic`. Same as public signup: owner, draft chatbot, and a general pipeline. Duplicate emails show an error.

**Writes:** organisation, owner profile, draft chatbot, pipeline.

**Related:** [adminCreateClinic](../apis.md#admincreateclinic)

## /admin/clinics/[id]

**File:** `src/app/admin/clinics/[id]/page.tsx`  
**Who:** platform admin

Hub for one clinic. Admins can do the clinic’s own jobs from here without waiting on impersonation:

- Subscription panel (status, widget access, Stripe ids) via `adminSetSubscription`
- Account and branding (name, colour, logo, phone, booking URL) via `adminSaveBranding`
- Team list and **Add staff** via `adminInviteStaff`
- Chatbots (list plus **Set up with AI**)
- Recent leads, with links to the full lead table
- Internal support notes (`adminAddSupportNote`)
- Delete clinic
- Shortcuts: chatbots, leads, billing, **Open as clinic**, clinic settings, pipelines

Unknown ids return 404.

**Reads/writes:** that organisation’s clinic store (`organizations`, `profiles`, `chatbots`, `leads`, `supportNotes`, `plans`).

**Related:** [/admin/clinics/[id]/billing](#adminclinicsidbilling)

## /admin/clinics/[id]/billing

**File:** `src/app/admin/clinics/[id]/billing/page.tsx`  
**Who:** platform admin

Subscription and Stripe for one clinic:

- The same subscription panel as the hub (status chips, courtesy widget access, price).
- Link an existing Stripe customer id (`adminLinkStripe`).
- Create a subscription on Stripe (`adminCreateStripeSub`).
- Charge the card on file (`adminCharge`).
- Toggle **allow widget without subscription** (`adminToggleWidgetException`).

Without Stripe keys this is an error on a live database. Local JSON demo can still simulate create/charge. Status is stored on the organisation.

**Reads/writes:** `organizations`, `plans`; may call Stripe.

## /admin/clinics/[id]/chatbots

**File:** `src/app/admin/clinics/[id]/chatbots/page.tsx`  
**Who:** platform admin

That clinic’s chatbots. **Set up with AI** creates a draft and impersonates into the setup wizard. **Add ready chatbot** creates a finished bot and opens the studio. **Edit** impersonates into studio or setup. **Delete** removes the bot (`adminDeleteChatbot`).

**Reads/writes:** `chatbots` for that organisation.

## /admin/clinics/[id]/leads

**File:** `src/app/admin/clinics/[id]/leads/page.tsx`  
**Who:** platform admin

Lead table for that clinic. **Open** impersonates into `/app/leads/[id]` so the admin can edit CRM fields. **Open clinic CRM** goes to the full list.

**Reads:** `leads` for that organisation.

## /admin/plans

**File:** `src/app/admin/plans/page.tsx`  
**Who:** platform admin

The monthly plan clinics subscribe to, shown with a large GBP price. Edit name, amount in pence, optional Stripe Price id, and active flag. Saved with `adminSavePlan`.

**Reads/writes:** `plans`.

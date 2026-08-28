# Platform admin

Everything under `/admin` is for **super_admin** only. The layout (`src/app/admin/layout.tsx`) calls `requireAdmin()`; other roles are sent to `/app`.

Nav: Clinics, Add clinic, Plans. Search on the shell filters the clinic directory.

Admins can **Open as clinic** (impersonate). That sets `dentchat_impersonate_org` and sends them into `/app` for that practice. The clinic shell shows an impersonation banner; **Exit clinic** clears the cookie (`exitImpersonate`).

Related: [architecture.md](../architecture.md), [clinic-app.md](clinic-app.md), [apis.md](../apis.md).

## /admin

**File:** `src/app/admin/page.tsx`  
**Who:** platform admin

Directory of every practice. Search by name (`?q=`). Each row shows subscription status and lead count. Actions: **Open** (clinic hub) and **Open as clinic** (impersonate).

**Reads:** `organizations`, `leads`. Impersonate writes the impersonation cookie.

**Related:** [/admin/clinics/[id]](#adminclinicsid), [impersonate](../apis.md#impersonate)

## /admin/clinics/new

**File:** `src/app/admin/clinics/new/page.tsx`  
**Who:** platform admin

Manually create a practice: owner name, email, temporary password (required, 8+ characters). Posts to `adminCreateClinic`. This is the admin equivalent of public signup.

**Writes:** organisation and owner profile.

**Related:** [adminCreateClinic](../apis.md#admincreateclinic)

## /admin/clinics/[id]

**File:** `src/app/admin/clinics/[id]/page.tsx`  
**Who:** platform admin

Hub for one clinic: staff list, chatbots, recent leads, internal support notes, links to billing / chatbots / leads, and **Open as clinic**.

Support notes are only for platform staff (`adminAddSupportNote`). They are not shown to the clinic.

Unknown ids return 404.

**Reads/writes:** `organizations`, `profiles`, `chatbots`, `leads`, `supportNotes`.

**Related:** [/admin/clinics/[id]/billing](#adminclinicsidbilling)

## /admin/clinics/[id]/billing

**File:** `src/app/admin/clinics/[id]/billing/page.tsx`  
**Who:** platform admin

Stripe and exceptions for one clinic:

- Link an existing Stripe customer id (`adminLinkStripe`).
- Create a subscription on Stripe (`adminCreateStripeSub`).
- Charge the card on file (`adminCharge`).
- Toggle **allow widget without subscription** (`adminToggleWidgetException`) so the embed works even if the clinic is not paying.

Without Stripe keys this is an error on a live database. Local JSON demo can still simulate create/charge. Status is stored on the organisation.

**Reads/writes:** `organizations`, `plans`; may call Stripe.

## /admin/clinics/[id]/chatbots

**File:** `src/app/admin/clinics/[id]/chatbots/page.tsx`  
**Who:** platform admin

Read-oriented list of that clinic’s chatbots. Admin can create a bot for the clinic (`adminCreateChatbot`), delete one (`adminDeleteChatbot`), and jump into the clinic studio via impersonation to edit appearance.

**Reads/writes:** `chatbots` for that organisation.

## /admin/clinics/[id]/leads

**File:** `src/app/admin/clinics/[id]/leads/page.tsx`  
**Who:** platform admin

Read-oriented lead table for that clinic. To edit CRM fields, the admin impersonates and uses `/app/leads`.

**Reads:** `leads` for that organisation.

## /admin/plans

**File:** `src/app/admin/plans/page.tsx`  
**Who:** platform admin

Edit the monthly plan clinics subscribe to: name, amount in pence, optional Stripe Price id, active flag. Saved with `adminSavePlan`.

**Reads/writes:** `plans`.

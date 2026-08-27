# Public pages

Marketing and account pages. Anyone can open these. They do not require a session.

Related: [architecture.md](../architecture.md) (sign-in), [clinic-app.md](clinic-app.md) (where clinic users land after login).

## /

**File:** `src/app/page.tsx`  
**Who:** anyone

The marketing home page for LeadDoc. It explains the product (AI chat widgets for dental practices, lead CRM, billing) and sends people to sign up or log in.

It renders `MarketingHome` (`src/components/landing/marketing-home.tsx`), including a live-looking chat preview (`hero-chat.tsx`). Nothing is written to the store from this page.

**Related:** [/signup](#/signup), [/login](#/login)

## /login

**File:** `src/app/login/page.tsx` (form in `login-form.tsx`)  
**Who:** anyone; clinic staff and platform admins use the same form

Sign-in for the clinic app and the platform admin. The form posts email and password to `POST /api/auth/login`. Invalid credentials reload this page with `?error=invalid`. Demo accounts are printed on the page.

After a valid login, super admins go to `/admin` and everyone else goes to `/app`.

**Reads/writes:** looks up `profiles` and sets the `dentchat_session` cookie (via the login API).

**Related:** [/signup](#/signup), [POST /api/auth/login](../apis.md#apiauthlogin)

## /signup

**File:** `src/app/signup/page.tsx`  
**Who:** anyone creating a new practice

Self-service registration. The visitor enters their name, practice name, email, and a password (8+ characters). The form posts to `POST /api/form/signup`.

On success the new owner is signed in and sent to the clinic app. Errors: `?error=exists` (email already registered) or `?error=invalid` (missing fields or short password).

**Reads/writes:** creates an organisation, an owner profile, a default chatbot (and widget key), and default treatment pipelines.

**Related:** [/login](#/login), [signup handler](../apis.md#signup)

# Public pages

Marketing and account pages. Anyone can open these. They do not require a session.

Related: [architecture.md](../architecture.md) (sign-in), [clinic-app.md](clinic-app.md) (where clinic users land after login).

## /

**File:** `src/app/page.tsx`  
**Who:** anyone

The marketing home page for LeadDoc. It explains the product (AI chat widgets for dental practices, lead CRM, billing) and sends people to sign up or log in.

The header and footer show the official LeadDr. wordmark (light-background version on the cream page). It scales down on small screens so it stays on one line with the Log in and Start free clinic buttons.

It renders `MarketingHome` (`src/components/landing/marketing-home.tsx`), including a static chat preview (`hero-chat.tsx`). Links to privacy and terms sit in the footer. Nothing is written to the store from this page.

**Related:** [/signup](#/signup), [/login](#/login)

## /login

**File:** `src/app/login/page.tsx` (form in `login-form.tsx`)  
**Who:** anyone; clinic staff and platform admins use the same form

Sign-in for the clinic app and the platform admin. The form posts email and password to `POST /api/auth/login`. Invalid credentials reload this page with `?error=invalid`. A link goes to forgot password. The cream auth pages (login, signup, forgot/reset password, privacy, terms) use the official LeadDr. wordmark for a light background.

After a valid login, super admins go to `/admin` and everyone else goes to `/app`.

**Reads/writes:** looks up `profiles` and sets the signed `dentchat_session` cookie (via the login API).

**Related:** [/signup](#/signup), [/forgot-password](#/forgot-password), [POST /api/auth/login](../apis.md#apiauthlogin)

## /signup

**File:** `src/app/signup/page.tsx`  
**Who:** anyone creating a new practice

Self-service registration. The visitor enters their name, practice name, email, and a password (8+ characters). The form posts to `POST /api/form/signup`.

On success the new owner is signed in and sent to the AI setup wizard for their first chatbot (inactive until they go live). Errors: `?error=exists` (email already registered) or `?error=invalid` (missing fields or short password).

**Reads/writes:** creates an organisation, an owner profile, a draft chatbot (and widget key), default treatment buttons, and a general pipeline.

**Related:** [/login](#/login), [signup handler](../apis.md#signup)

## /forgot-password

**File:** `src/app/forgot-password/page.tsx`  
**Who:** anyone

Asks for an email and posts to `requestPasswordReset`. Always shows a success message so it does not reveal whether the email exists. If it does, Resend sends a one-hour link to `/reset-password`.

**Related:** [/reset-password](#/reset-password)

## /reset-password

**File:** `src/app/reset-password/page.tsx`  
**Who:** anyone with a valid token from email

Sets a new password (8+ characters) via `resetPassword`. Invalid or expired tokens show an error. Success sends the person to login.

## /privacy

**File:** `src/app/privacy/page.tsx`  
**Who:** anyone

Plain-English privacy note: LeadDoc stores clinic accounts and widget leads (name, email, phone, enquiry) so the practice can follow up.

## /terms

**File:** `src/app/terms/page.tsx`  
**Who:** anyone

Plain-English terms: monthly subscription, widget gated on billing, AI replies are not clinical advice, cancel from Settings.

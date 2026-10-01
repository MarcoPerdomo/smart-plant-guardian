# Signup privacy improvements

## 1. Newsletter checkbox starts unticked (EU compliance)

- In the signup form, the optional newsletter/product-updates checkbox now starts **unchecked** instead of pre-ticked.
- Users who want the newsletter tick it themselves; this counts as valid consent under EU privacy law.
- Everything else about the newsletter flow (confirmation email after account verification) stays the same.

## 2. Privacy-preserving "email already in use" handling

Replace the current check that tells the visitor "this email is already registered" (which leaks whether someone has an account) with a neutral flow:

- **Signup always shows the same message:** after submitting, everyone sees "If this email can be used, you'll receive a verification link shortly." No difference between new and existing emails.
- **If the email is free:** the normal verification email is sent, as today.
- **If the email is already registered (active or pending deletion):** no account is created and nothing is shown to the visitor. Instead, the **existing account owner** receives an email saying someone tried to sign up with their address, with links to sign in or reset their password if it was them, and a note they can ignore it otherwise.
- The server-side check still runs (so duplicate accounts remain impossible); only what the visitor sees changes.

## Technical details

- `src/lib/signup-check.functions.ts`: change the duplicate-email response from a visible error to a silent "ok" result, and trigger the "someone tried to sign up with your email" notice to the existing owner via the existing email sending helper (sent to the account owner's address only).
- Signup form component: newsletter checkbox default `false`; remove the inline "email already in use" error display; always show the neutral confirmation message after submit.
- New email template for the existing-owner notice, sent through the existing Lovable email infrastructure.
- Verify with `bunx tsgo --noEmit` and the build log.

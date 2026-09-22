# Sign-up: repeat password + email verification

## What changes for people signing up

1. On "Create account", a second password box appears: **Repeat password**. The button stays disabled (with a short inline hint) until both entries match and the password is at least 8 characters. A small strength hint shows while typing.
2. After creating the account, instead of a vague "check your email" toast, the page switches to a **Verify your email** step:
   - Shows the address the code went to.
   - A 6-digit code box.
   - "Resend code" with a 60-second cooldown.
   - "Use a different email" to go back.
3. The confirmation email contains **both** a 6-digit code and a click-through link. Typing the code verifies on the spot and signs the person in; clicking the link in the email also works and lands them signed in.
4. Only verified people reach the app. A new account that has not verified yet is bounced to the verification step on sign-in, with the code re-sent automatically.
5. Accounts that already exist today are unaffected — they keep signing in as usual. Google sign-in is unaffected (Google already verifies the address).

## Terms and privacy

The consent checkbox stays on the sign-up form. Acceptance is recorded once verification succeeds (so unverified attempts don't leave stray records).

## Technical notes

- `src/routes/auth.tsx`: add `confirmPassword` state and field (sign-up only), client-side match + length validation, and a third view mode `verify` alongside `signin`/`signup`.
- Verification uses Supabase's built-in signup OTP: `supabase.auth.verifyOtp({ email, token, type: "signup" })`; resend uses `supabase.auth.resend({ type: "signup", email })`.
- The "already exists but unverified" path: on `signInWithPassword` returning `email_not_confirmed`, switch to the verify view and trigger a resend.
- Consent recording (`recordAcceptance`) moves from immediately-after-signUp to immediately-after-successful-verification; the pending consent flag is held in component state.
- Cut-off for "existing accounts keep working": nothing in the app blocks them — Supabase itself only marks new sign-ups unconfirmed, and already-confirmed users pass straight through.

### One dashboard step you'll need to do

The project runs on your own Supabase project, so the **Confirm signup** email template lives there. For the code to arrive, that template needs the token added next to the existing link, e.g.:

```text
<p>Your Verdant verification code: <strong>{{ .Token }}</strong></p>
<p>Or click here to confirm: <a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

I'll give you the exact snippet and the dashboard link when the code side is done. Until that template is updated, the link still works but no code will show in the email.

# Fix code length mismatch on sign-up verification

## Root cause
Supabase creates the code (`{{ .Token }}`) using its own **Email OTP Length** setting. You're using your own Supabase project, so it uses that setting, and your email shows 8 digits. The Sentia sign-up page assumes the code is always 6 digits:
- the input field cuts off anything after 6 characters (`maxLength={6}` and `.slice(0, 6)`)
- "Verify and continue" stays disabled unless the code has exactly 6 digits
- the check before submitting rejects anything that isn't 6 digits
- the text on the page and in the error messages says "6-digit code"

So an 8-digit code gets cut to 6 and always fails. Nothing is broken in the email itself.

## Fix (two parts, both recommended)

1. **Make the sign-up page accept any length (in the app)**
   - Accept codes from 6 to 10 digits, which is the range Supabase allows.
   - Paste-friendly: strip spaces or dashes, keep digits only.
   - Turn on "Verify and continue" once the code has at least 6 digits.
   - Neutral text: "We sent a verification code to ..." and "Please enter the code from your email."
   - Widen the input slightly so 8 to 10 digits fit with the current spacing between digits.
   - Keep the same look, no em dashes.

2. **Pick one length in Supabase (you do this)**
   - Supabase Dashboard, Authentication, then Providers, Email: set **Email OTP Length** to the length you want (6 is the most common and easiest to type). With part 1 in place, 6 or 8 both work.

## Out of scope
The email template, the Brevo SMTP setup, and the rest of the sign-in flow stay as they are.

## Technical details
- File: `src/routes/auth.tsx` only (verify view and `handleVerify`).
- Constants `OTP_MIN = 6`, `OTP_MAX = 10`. Validate `token.length >= OTP_MIN && token.length <= OTP_MAX`. `verifyOtp({ type: "signup" })` doesn't change.
- Testing: with a signed-out browser, check that an 8-digit code typed into the field stays complete and enables the button.

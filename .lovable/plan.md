# Branded sign-up emails with a working code

## What is happening
- The branded Sentia emails (with the 6-digit code) already exist in the app, and the sender domain notify.sentia-plants.com is verified.
- But your login system is connected to your own Supabase project, not one Lovable manages. Lovable cannot switch that project over to the Sentia emails, so Supabase keeps sending its plain default email from noreply@mail.app.supabase.io (confirmed in the sign-in logs).
- That default email only contains a link, no code. That is why the code box on the sign-up page never gets a code.

## The fix (done in your Supabase dashboard, I will give exact text to paste)
1. **Authentication > Emails > Templates > "Confirm signup"**: replace the subject and body with a Sentia-branded version (green header, logo, wording matching the app) that shows both the 6-digit code and the confirm button. I will prepare the full HTML for this and the other templates (reset password, magic link, change email, reauthentication) so all match.
2. **Authentication > Emails > SMTP settings**: turn on custom SMTP so emails come from "Sentia <noreply@sentia-plants.com>" instead of Supabase, and the "powered by Supabase" footer disappears. This needs an SMTP provider login (for example Brevo, which you already looked at, free up to 300 emails a day). The current notify.sentia-plants.com setup cannot be used as SMTP.
3. **Authentication > Providers > Email**: keep "Confirm email" on, and set the email code length to 6 to match the code boxes in the app.
4. **Sign-in rate limit**: once custom SMTP is on, raise the hourly email limit so test sign-ups are not blocked.

## In the app
- Check the sign-up page accepts the 6-digit code and that "Resend code" works with the new template.
- Test a full sign-up again and confirm the code and link both work.

## Technical details
- Supabase templates use Go variables: `{{ .Token }}` for the code, `{{ .ConfirmationURL }}` for the link, `{{ .SiteURL }}` set to https://sentia-plants.com.
- I will generate the HTML from the existing React Email templates in `src/lib/email-templates/` so styling stays identical, and save the output files for you to copy.
- `verifyOtp({ type: "signup" })` in `src/routes/auth.tsx` already handles the code; only a length check may need adjusting.
- The Lovable auth webhook route stays in place but unused unless the project later moves to Lovable-managed Cloud.

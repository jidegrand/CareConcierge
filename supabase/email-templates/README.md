# Supabase Auth Email Templates

These templates are the source of truth for hosted Supabase Auth emails.

For hosted projects, Supabase does not read these files automatically. Copy the
HTML into the Supabase Dashboard:

```text
Authentication -> Email -> Templates
```

## Current App Flows

- Staff invites and global admin invites call `supabase.auth.signInWithOtp(...)`.
- Normal passwordless login also calls `supabase.auth.signInWithOtp(...)`.
- Because of that, invite-style emails use the Supabase **Magic Link** template.
- Password recovery uses the Supabase **Reset Password** template.

## Templates

| Supabase template | Subject | File |
| --- | --- | --- |
| Magic Link | `Your Care Concierge access link` | `magic-link.html` |
| Reset Password | `Reset your Care Concierge password` | `recovery.html` |

## Theme

The templates mirror the development UI theme:

- Dark shell: `#0D1117`
- Surface: `#161B22`
- Border: `#30363D`
- Primary text: `#E6EDF3`
- Muted text: `#8B949E`
- Clinical blue CTA: `#1D6FA8`
- Dark-mode accent blue: `#4DA6E8`

The HTML uses table layout and inline styles for email client compatibility. Do
not add external fonts, scripts, or app CSS imports.

Keep `{{ .ConfirmationURL }}` in the template. The app passes the final redirect
URL in code, for example `/set-password`, `/dashboard`, or `/reset-password`.

## Resend SMTP

Recommended provider: Resend.

```text
Host: smtp.resend.com
Port: 587
Username: resend
Password: <Resend API key>
Sender email: no-reply@care.extendihealth.com
Sender name: Care Concierge
```

Before enabling SMTP, verify the sending domain in Resend. If link/click
tracking is enabled in the provider, disable it for Supabase Auth emails so the
Supabase confirmation URLs are not rewritten.

# Supabase Email Templates

These templates are the source of truth for Care Concierge emails.

Hosted Supabase projects do not read these files automatically. Copy only the
six Supabase Dashboard templates into:

```text
Authentication -> Email -> Templates
```

The Supabase Dashboard email template block exposes these six Authentication
slots:

- Confirm sign up
- Invite user
- Magic link
- Change email address
- Reset password
- Reauthentication

Use `supabase-auth-map.json` for those six slots only.

## Security Posture

- Magic-link/passwordless sign-in is disabled in the app.
- The Supabase **Magic link** template is now a disabled sink and intentionally
  omits `{{ .ConfirmationURL }}`.
- Staff and admin onboarding must use Supabase's **Invite user** template.
- The **Invite user** template does not place a Supabase verification token in
  the link. It links to `/set-password?invite_email=...` and displays
  `{{ .Token }}` as a one-time invitation code. This prevents email provider
  prefetch/scanning from consuming the invite before the user accepts it in the
  app.
- Public signups should stay disabled in Supabase Auth settings.
- Invites must be sent from a trusted server or Supabase Edge Function because
  `inviteUserByEmail` requires privileged Auth Admin access.

## Current App Flows

- Login uses `supabase.auth.signInWithPassword(...)`.
- Password recovery calls the `request-password-reset` Edge Function, which
  resolves the user's tenant and calls `supabase.auth.resetPasswordForEmail(...)`
  with a tenant-subdomain `redirectTo`.
- Staff, tenant admin, and global admin invites call the `invite-user` Edge
  Function, which uses `supabase.auth.admin.inviteUserByEmail(...)`.
- New invitees land on `/set-password` and create a password before entering the
  app.

## Supabase Dashboard Templates

| Supabase template | Subject | File | Notes |
| --- | --- | --- | --- |
| Confirm sign up | `Confirm your Care Concierge account` | `confirmation.html` | Fallback only; public signup should be disabled |
| Invite user | `You're invited to Care Concierge` | `invite.html` | Primary invite template; uses `{{ .Token }}` code entry |
| Magic link | `Magic link sign-in is disabled` | `magic-link.html` | No `{{ .ConfirmationURL }}` |
| Change email address | `Confirm your Care Concierge email change` | `email-change.html` | Auth template |
| Reset password | `Reset your Care Concierge password` | `recovery.html` | Auth template |
| Reauthentication | `Confirm this Care Concierge security step` | `reauthentication.html` | Uses `{{ .Token }}` |

## Reference Security Templates

These files are not visible in the Supabase Dashboard template block shown above.
Keep them as reference templates for a future app-owned mailer, or for a
Supabase Management API path if the project exposes notification template keys:

- `password-changed-notification.html`
- `email-changed-notification.html`
- `phone-changed-notification.html`
- `identity-linked-notification.html`
- `identity-unlinked-notification.html`
- `mfa-factor-enrolled-notification.html`
- `mfa-factor-unenrolled-notification.html`

## Workflow Templates

Workflow templates are not Supabase Auth Dashboard slots. They are plain HTML
templates for future app-owned email sending through an Edge Function, Resend,
or another transactional email service. See `workflow-map.json`.

Covered workflows:

- Account deactivated / reactivated
- Access changed
- Invite reminder / invite cancelled
- Organization welcome
- Onboarding nudge
- License activated / expiring / expired / suspended
- Usage limit warning
- Upgrade request notifications
- Shift handover summary
- Manager daily digest
- Scheduled report delivery
- Low CSAT alert
- Overdue urgent request escalation
- Unread staff chat digest
- Platform audit alert

## Edge Function

Deploy the auth email functions before using invite or reset-password UI:

```bash
supabase functions deploy invite-user
supabase functions deploy request-password-reset
```

Verify the functions have access to:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APP_URL=https://care.extendihealth.com
TENANT_ROOT_DOMAIN=extendihealth.com
```

`APP_URL` is the platform/root app URL. `TENANT_ROOT_DOMAIN` is the domain used
to build tenant links, for example `<tenant-slug>.extendihealth.com`. If tenants
live under `care.extendihealth.com`, set `TENANT_ROOT_DOMAIN=care.extendihealth.com`
instead.

Add the app callback URLs to Supabase Auth redirect allow list:

```text
https://care.extendihealth.com/set-password
https://care.extendihealth.com/reset-password
https://*.extendihealth.com/set-password
https://*.extendihealth.com/reset-password
http://localhost:5173/set-password
http://localhost:5173/reset-password
```

If reset or invite emails send users to the root app instead of their tenant
subdomain, verify `TENANT_ROOT_DOMAIN` and the wildcard redirect URLs. Supabase
uses `.` and `/` as wildcard separators, so use `*` for one tenant-label level
or exact tenant URLs for stricter production allow lists.

## Theme

The templates mirror the app's dark clinical theme:

- Dark shell: `#0D1117`
- Surface: `#161B22`
- Border: `#30363D`
- Primary text: `#E6EDF3`
- Muted text: `#8B949E`
- Clinical blue CTA: `#1D6FA8`
- Accent blue: `#4DA6E8`

The HTML uses table layout and inline styles for email client compatibility. Do
not add external fonts, scripts, or app CSS imports.

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
tracking is enabled in the provider, disable it for Supabase Auth emails so
Supabase verification URLs are not rewritten.

# Supabase Email Templates

These templates are the source of truth for Care Concierge emails.

Hosted Supabase projects do not read these files automatically. Copy each Auth
template into:

```text
Authentication -> Email -> Templates
```

For Management API updates, use `supabase-auth-map.json` to map each file to
its Supabase config key.

## Security Posture

- Magic-link/passwordless sign-in is disabled in the app.
- The Supabase **Magic link** template is now a disabled sink and intentionally
  omits `{{ .ConfirmationURL }}`.
- Staff and admin onboarding must use Supabase's **Invite user** template.
- Public signups should stay disabled in Supabase Auth settings.
- Invites must be sent from a trusted server or Supabase Edge Function because
  `inviteUserByEmail` requires privileged Auth Admin access.

## Current App Flows

- Login uses `supabase.auth.signInWithPassword(...)`.
- Password recovery uses `supabase.auth.resetPasswordForEmail(...)`.
- Staff, tenant admin, and global admin invites call the `invite-user` Edge
  Function, which uses `supabase.auth.admin.inviteUserByEmail(...)`.
- New invitees land on `/set-password` and create a password before entering the
  app.

## Supabase Auth Templates

| Supabase template | Subject | File | Notes |
| --- | --- | --- | --- |
| Confirm sign up | `Confirm your Care Concierge account` | `confirmation.html` | Fallback only; public signup should be disabled |
| Invite user | `You're invited to Care Concierge` | `invite.html` | Primary invite template |
| Magic link | `Magic link sign-in is disabled` | `magic-link.html` | No `{{ .ConfirmationURL }}` |
| Change email address | `Confirm your Care Concierge email change` | `email-change.html` | Auth template |
| Reset password | `Reset your Care Concierge password` | `recovery.html` | Auth template |
| Reauthentication | `Confirm this Care Concierge security step` | `reauthentication.html` | Uses `{{ .Token }}` |
| Password changed notification | `Your Care Concierge password was changed` | `password-changed-notification.html` | Enable project-level notification |
| Email address changed notification | `Your Care Concierge email address was changed` | `email-changed-notification.html` | Enable project-level notification |
| Phone number changed notification | `Your Care Concierge phone number was changed` | `phone-changed-notification.html` | Enable project-level notification if phone auth is used |
| Identity linked notification | `A new identity was linked to your Care Concierge account` | `identity-linked-notification.html` | Enable if external identities are used |
| Identity unlinked notification | `An identity was unlinked from your Care Concierge account` | `identity-unlinked-notification.html` | Enable if external identities are used |
| MFA method added notification | `A Care Concierge MFA method was added` | `mfa-factor-enrolled-notification.html` | Enable when MFA is available |
| MFA method removed notification | `A Care Concierge MFA method was removed` | `mfa-factor-unenrolled-notification.html` | Enable when MFA is available |

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

Deploy the invite function before using any invite UI:

```bash
supabase functions deploy invite-user
```

Verify the function has access to:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Add the app callback URL to Supabase Auth redirect allow list:

```text
https://<app-domain>/set-password
http://localhost:5173/set-password
```

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

export function formatInviteEmailError(message: string) {
  if (/error sending (magic link|confirmation|invite) email/i.test(message)) {
    return 'Supabase could not send the auth email. Verify the Auth SMTP sender domain in Resend, then try again.'
  }

  return message
}

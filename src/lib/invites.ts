function getErrorMessage(payload: unknown) {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (typeof payload !== 'object') return null

  const body = payload as { error?: unknown; message?: unknown }
  if (typeof body.error === 'string') return body.error
  if (typeof body.message === 'string') return body.message

  return null
}

async function getFunctionResponseMessage(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context
  if (!context || typeof context !== 'object') return null

  const response = context as Response
  if (typeof response.clone !== 'function') return null

  try {
    return getErrorMessage(await response.clone().json())
  } catch {
    try {
      const text = await response.clone().text()
      return text.trim() || null
    } catch {
      return null
    }
  }
}

export async function getInviteFunctionError(data: unknown, error: unknown) {
  const bodyMessage = getErrorMessage(data) ?? (await getFunctionResponseMessage(error))
  const fallback = error instanceof Error ? error.message : null

  return bodyMessage ?? fallback
}

export function formatInviteEmailError(message: string) {
  if (/error sending (magic link|confirmation|invite) email/i.test(message)) {
    return 'Supabase could not send the auth email. Verify the Auth SMTP sender domain in Resend, then try again.'
  }

  return message
}

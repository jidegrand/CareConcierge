import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

interface InviteRequest {
  fullName?: string
  relationship?: string | null
  email?: string
  redirectTo?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INVITE_EXPIRY_DAYS = 7

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

async function hashToken(token: string) {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { error: 'Invite service is not configured.' })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return json(401, { error: 'Missing authorization token.' })
    }

    const body = (await req.json()) as InviteRequest
    const fullName = (body.fullName ?? '').trim()
    const relationship = (body.relationship ?? '').trim() || null
    const email = normalizeEmail(body.email)
    const redirectTo = typeof body.redirectTo === 'string' && body.redirectTo.trim()
      ? body.redirectTo.trim()
      : undefined

    if (!fullName) {
      return json(400, { error: 'Enter the family member’s name.' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(400, { error: 'Enter a valid email address.' })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: authUser, error: authError } = await admin.auth.getUser(token)
    if (authError || !authUser.user) {
      return json(401, { error: 'Your login session could not be verified. Sign out, sign back in, then send the invite again.' })
    }

    const { data: callerFamily, error: callerError } = await admin
      .from('family_members')
      .select('id, resident_id, access_level, email, full_name')
      .eq('auth_user_id', authUser.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (callerError || !callerFamily) {
      return json(403, { error: 'Only an active family member can send this invite.' })
    }

    if (callerFamily.email && normalizeEmail(callerFamily.email) === email) {
      return json(400, { error: 'You can\'t invite yourself.' })
    }

    const { data: resident, error: residentError } = await admin
      .from('residents')
      .select('id, tenant_id')
      .eq('id', callerFamily.resident_id)
      .single()

    if (residentError || !resident) {
      return json(404, { error: 'Resident not found.' })
    }

    const { data: existing, error: existingError } = await admin
      .from('family_members')
      .select('id, status')
      .eq('resident_id', resident.id)
      .eq('email', email)
      .maybeSingle()

    if (existingError) {
      return json(400, { error: existingError.message })
    }
    if (existing?.status === 'active') {
      return json(400, { error: 'This email already has active access to this resident.' })
    }

    let familyMemberId = existing?.id

    if (familyMemberId) {
      const { error: updateError } = await admin
        .from('family_members')
        .update({
          full_name: fullName,
          relationship,
          access_level: callerFamily.access_level,
          status: 'invited',
          invited_by: authUser.user.id,
        })
        .eq('id', familyMemberId)

      if (updateError) return json(400, { error: updateError.message })
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('family_members')
        .insert({
          resident_id: resident.id,
          full_name: fullName,
          relationship,
          email,
          access_level: callerFamily.access_level,
          status: 'invited',
          invited_by: authUser.user.id,
        })
        .select('id')
        .single()

      if (insertError || !inserted) {
        return json(400, { error: insertError?.message ?? 'Failed to create family member record.' })
      }
      familyMemberId = inserted.id
    }

    const inviteToken = crypto.randomUUID()
    const tokenHash = await hashToken(inviteToken)
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { error: inviteRowError } = await admin
      .from('family_invites')
      .insert({
        family_member_id: familyMemberId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_by: authUser.user.id,
      })

    if (inviteRowError) return json(400, { error: inviteRowError.message })

    const { error: pendingError } = await admin
      .from('pending_family_invites')
      .upsert({
        email,
        tenant_id: resident.tenant_id,
        family_member_id: familyMemberId,
      }, { onConflict: 'email' })

    if (pendingError) return json(400, { error: pendingError.message })

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        family_invite: true,
        family_member_id: familyMemberId,
        resident_id: resident.id,
        full_name: fullName,
        invited_by_name: callerFamily.full_name,
      },
    })

    const userAlreadyExists = inviteError?.message?.toLowerCase().includes('already registered') ?? false

    if (inviteError && !userAlreadyExists) {
      return json(400, { error: inviteError.message })
    }

    if (userAlreadyExists) {
      return json(200, {
        success: true,
        warning: `${email} already has an account. Ask them to sign out and back in to pick up family access, or contact support to link it.`,
      })
    }

    return json(200, { success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send invite.'
    return json(400, { error: message })
  }
})

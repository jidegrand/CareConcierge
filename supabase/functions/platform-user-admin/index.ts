import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

interface AdminRequest {
  action?: 'emails' | 'delete'
  userIds?: string[]
  userId?: string
}

interface AuthUser {
  id: string
  email?: string
}

interface UserProfileRow {
  id: string
  role: string
  active: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

async function listAllUsers(admin: ReturnType<typeof createClient>) {
  const users: AuthUser[] = []
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (!data.nextPage) break
  }
  return users
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
      return json(500, { error: 'Platform admin service is not configured.' })
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return json(401, { error: 'Missing authorization token.' })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authUser, error: authError } = await admin.auth.getUser(token)
    if (authError || !authUser.user) {
      return json(401, { error: 'Your login session could not be verified. Sign out, sign back in, then try again.' })
    }

    const { data: callerProfile, error: profileError } = await admin
      .from('user_profiles')
      .select('id, role, active')
      .eq('id', authUser.user.id)
      .single()

    if (profileError || !callerProfile) {
      return json(403, { error: 'Only active global admins can manage platform users.' })
    }

    const caller = callerProfile as UserProfileRow
    if (!caller.active || caller.role !== 'super_admin') {
      return json(403, { error: 'Only active global admins can manage platform users.' })
    }

    const body = (await req.json()) as AdminRequest

    if (body.action === 'emails') {
      const requestedIds = new Set((body.userIds ?? []).filter((id): id is string => typeof id === 'string'))
      if (requestedIds.size === 0) {
        return json(200, { emails: {} })
      }

      const users = await listAllUsers(admin)
      const emails: Record<string, string> = {}
      for (const user of users) {
        if (requestedIds.has(user.id) && user.email) {
          emails[user.id] = user.email
        }
      }

      return json(200, { emails })
    }

    if (body.action === 'delete') {
      const targetId = typeof body.userId === 'string' ? body.userId : ''
      if (!targetId) {
        return json(400, { error: 'userId is required.' })
      }
      if (targetId === caller.id) {
        return json(400, { error: 'You cannot delete your own account.' })
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(targetId)
      if (deleteError) {
        return json(400, { error: deleteError.message })
      }

      return json(200, { success: true })
    }

    return json(400, { error: 'Unknown action.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to process request.'
    return json(400, { error: message })
  }
})

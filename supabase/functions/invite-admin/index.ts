// Supabase Edge Function: invite-admin
// Invites an email to Auth and promotes to admin_members.
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (for user lookup), ORIGIN (optional)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ORIGIN = Deno.env.get('ORIGIN') || 'https://example.com'

serve(async (req) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

    const body = await req.json().catch(() => ({}))
    const email: string = String(body.email || '').trim().toLowerCase()
    const name: string = String(body.name || 'Admin')
    const role: string = String(body.role || 'admin')
    const username: string | null = body.username ? String(body.username) : null
    const avatar_url: string | null = body.avatar_url ? String(body.avatar_url) : null
    if (!email) return Response.json({ ok: false, error: 'Email required' }, { status: 400 })

    // Get caller user from Authorization header (bearer token from supabase-js)
    const authHeaders = { Authorization: req.headers.get('Authorization') || '' }
    const supabase = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: authHeaders } })
    const { data: ures } = await supabase.auth.getUser()
    const callerId = ures.user?.id
    if (!callerId) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // Use service-role client for privileged operations
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Ensure caller is an admin
    const { data: am, error: amErr } = await admin
      .from('admin_members')
      .select('user_id')
      .eq('user_id', callerId)
      .maybeSingle()
    if (amErr || !am) return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    // Invite user by email (creates auth.users row)
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${ORIGIN}/admin/login`
    })
    if (invErr) return Response.json({ ok: false, error: invErr.message }, { status: 400 })
    const invitedUserId = invited.user?.id
    if (!invitedUserId) return Response.json({ ok: false, error: 'Invite failed' }, { status: 400 })

    // Enforce separation from community_members
    const { data: cm } = await admin
      .from('community_members')
      .select('user_id')
      .eq('user_id', invitedUserId)
      .maybeSingle()
    if (cm) return Response.json({ ok: false, error: 'Email belongs to a community account' }, { status: 400 })

    // Upsert admin_members (status can be inactive until first login if desired)
    const uname = username || email.split('@')[0]
    const { error: upErr } = await admin
      .from('admin_members')
      .upsert({
        user_id: invitedUserId,
        name: name || 'Admin',
        email,
        username: uname,
        status: 'active',
        role: role || 'admin',
        avatar_url: avatar_url || null,
      }, { onConflict: 'user_id' })
    if (upErr) return Response.json({ ok: false, error: upErr.message }, { status: 400 })

    return Response.json({ ok: true, status: 'invited', user_id: invitedUserId })
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 })
  }
})


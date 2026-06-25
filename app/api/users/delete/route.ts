import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * POST /api/users/delete
 *
 * Permanently deletes the authenticated user's account.
 *
 * Two-step internally:
 * 1. Calls delete_user_account() (SECURITY DEFINER) to hard-delete all private
 *    data and orphan shared rows before the auth cascade fires.
 * 2. Calls auth.admin.deleteUser() via the service-role client, which deletes
 *    the auth.users row — cascading to public.users → all remaining owned rows.
 *
 * After this returns 200 the caller's session is invalid. The client should
 * redirect to /today, where ensureAnonymousSession() will start a fresh one.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Step 1: clear private data via SECURITY DEFINER function
    const { error: rpcError } = await supabase.rpc('delete_user_account', {
      p_user_id: user.id,
    })

    if (rpcError) {
      return NextResponse.json({ error: 'Deletion failed', detail: rpcError.message }, { status: 500 })
    }

    // Step 2: remove the auth record — cascades public.users and any remaining rows
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id)

    if (authError) {
      return NextResponse.json({ error: 'Auth deletion failed', detail: authError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

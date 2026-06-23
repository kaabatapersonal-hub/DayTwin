import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

/**
 * POST /api/sparks/gift
 *
 * Sends Sparks to a friend by calling gift_sparks() (SECURITY DEFINER).
 * The function validates friendship, deducts from sender, and awards to
 * recipient atomically — both sides of the transaction are always recorded.
 *
 * Body: { recipient_id: string, amount: number, message?: string }
 * Returns: { success: bool, new_balance?: number, error?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { recipient_id, amount, message } = await req.json() as {
      recipient_id?: string
      amount?:       number
      message?:      string
    }

    if (!recipient_id || !amount) {
      return NextResponse.json({ error: 'recipient_id and amount are required' }, { status: 400 })
    }

    if (!Number.isInteger(amount) || amount < 1 || amount > 500) {
      return NextResponse.json({ error: 'Amount must be a whole number between 1 and 500' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: result, error: rpcError } = await supabase.rpc('gift_sparks', {
      p_sender_id:    user.id,
      p_recipient_id: recipient_id,
      p_amount:       amount,
      p_message:      message ?? null,
    })

    if (rpcError) {
      return NextResponse.json({ error: 'Gift failed', detail: rpcError.message }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { NextResponse }  from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SparkTransaction } from '@/types'

const PAGE_SIZE = 20

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')   // ISO timestamp — fetch rows older than this

  let query = supabase
    .from('spark_transactions')
    .select('id, user_id, amount, reason, reference_type, reference_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json((data ?? []) as SparkTransaction[])
}

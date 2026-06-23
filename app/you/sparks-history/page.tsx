import { createClient }             from '@/lib/supabase/server'
import { SparksHistoryScreen }       from '@/components/you/SparksHistoryScreen'
import type { SparkTransaction }     from '@/types'

export default async function SparksHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <SparksHistoryScreen initialItems={[]} />
  }

  const { data } = await supabase
    .from('spark_transactions')
    .select('id, user_id, amount, reason, reference_type, reference_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <SparksHistoryScreen initialItems={(data ?? []) as SparkTransaction[]} />
  )
}

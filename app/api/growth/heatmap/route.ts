import { NextResponse }    from 'next/server'
import { createClient }    from '@/lib/supabase/server'
import { fetchHeatmapData } from '@/lib/weekly-review'

/**
 * GET /api/growth/heatmap
 * Returns the last 6 months of daily_scores for the consistency heatmap.
 * Each entry: { date: "YYYY-MM-DD", score_pct: number }.
 * Days with no data are NOT included — the client fills those as gray.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await fetchHeatmapData(supabase, user.id)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

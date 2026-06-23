import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { computeWeeklyReview, fetchWeeklyReviews } from '@/lib/weekly-review'
import { getWeekStart, todayISO }    from '@/lib/format'

/**
 * GET /api/growth/weekly-review
 * Returns all weekly_reviews for the authenticated user, newest first.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reviews = await fetchWeeklyReviews(supabase)
    return NextResponse.json(reviews)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/growth/weekly-review
 * Triggers an on-demand weekly review computation.
 * Body: { week_start?: "YYYY-MM-DD" } — defaults to the current week's Monday.
 *
 * Used when the user taps "Generate this week's review" in the Growth tab.
 * The Sunday Edge Function uses the same computeWeeklyReview logic.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const weekStart: string = body.week_start ?? getWeekStart(todayISO())

    const review = await computeWeeklyReview(supabase, user.id, weekStart)
    if (!review) return NextResponse.json({ error: 'Computation failed' }, { status: 500 })

    return NextResponse.json(review)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

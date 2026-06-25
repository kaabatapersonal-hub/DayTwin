import { createClient }         from '@/lib/supabase/server'
import { redirect }              from 'next/navigation'
import { fetchWeeklyReviews }    from '@/lib/weekly-review'
import { WeeklyReviewScreen }    from '@/components/growth/WeeklyReviewScreen'

export default async function WeeklyReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/today')

  const reviews = await fetchWeeklyReviews(supabase)

  return <WeeklyReviewScreen initialReviews={reviews} />
}

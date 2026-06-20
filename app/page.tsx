import { redirect } from 'next/navigation'

/** The root URL redirects to Today — the app's home screen. */
export default function Home() {
  redirect('/today')
}

import { createBrowserClient } from '@supabase/ssr'

// Singleton: @supabase/ssr docs say createBrowserClient should only be called
// once per browser context. Multiple instances have independent auth listeners
// and can disagree on which session is active, causing reads to go to a
// different user than writes.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}

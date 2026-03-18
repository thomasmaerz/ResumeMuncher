import { createClient } from '@supabase/supabase-js'
import { getConfig } from '@/lib/config'

export function createServerClient() {
  const config = getConfig()
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    global: {
      // Force bypass of Next.js 13/14 persistent disk cache
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' })
      },
    },
    auth: {
      persistSession: false,
    },
  })
}

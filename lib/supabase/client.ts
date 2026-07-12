import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for use inside Client Components ("use client").
 * Reads the public env vars, which are safe to expose to the browser —
 * data access is enforced by Postgres Row Level Security, not by hiding
 * this key.
 */
export function createClient() {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
}

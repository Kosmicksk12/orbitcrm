/**
 * Reads the Supabase URL + public key from environment variables.
 *
 * Supabase's dashboard "Connect" snippet now hands out the key under
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (the new sb_publishable_... format),
 * while older docs/tutorials use NEXT_PUBLIC_SUPABASE_ANON_KEY. We accept
 * either name so copy-pasting from either source just works, and throw a
 * clear, actionable error instead of the opaque "URL and Key are required"
 * message the raw Supabase client throws.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan las variables de entorno de Supabase. Revisa tu .env.local: " +
        "necesitas NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(o NEXT_PUBLIC_SUPABASE_ANON_KEY), y reinicia `npm run dev` después de editarlo."
    );
  }

  return { url, key };
}

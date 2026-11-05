import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { requireEnv } from "./env.ts";

export function createSecretClient(): SupabaseClient {
  const secretKey: string = JSON.parse(requireEnv("SUPABASE_SECRET_KEYS")).default;
  return createClient(requireEnv("SUPABASE_URL"), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

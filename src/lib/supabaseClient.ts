"use client";

import { createClient } from "@supabase/supabase-js";

const REQUIRED_SUPABASE_ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

const envValues = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export const missingSupabaseEnvKeys = REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !envValues[key]);
export const isSupabaseConfigured = missingSupabaseEnvKeys.length === 0;

const fallbackUrl = "http://127.0.0.1:54321";
const fallbackAnonKey = "missing-anon-key";

export const supabase = createClient(
  isSupabaseConfigured ? envValues.NEXT_PUBLIC_SUPABASE_URL! : fallbackUrl,
  isSupabaseConfigured ? envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY! : fallbackAnonKey
);

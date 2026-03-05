const SUPABASE_PAUSED_GUIDANCE =
  "Supabase may be paused. Please resume the project in the Supabase dashboard, wait a moment, and try again.";

const PAUSED_OR_UNREACHABLE_PATTERNS = [
  "failed to fetch",
  "fetch failed",
  "network request failed",
  "networkerror",
  "load failed",
  "service unavailable",
  "gateway timeout",
  "connection refused",
  "connection terminated",
  "timed out",
  "503",
  "502",
  "504",
];

const normalizeMessage = (value: string) => value.trim().replace(/\s+/g, " ");

const hasMessage = (value: unknown): value is { message: string } =>
  typeof value === "object" && value !== null && "message" in value && typeof (value as { message: unknown }).message === "string";

const looksLikeSupabasePaused = (message: string) => {
  const lower = message.toLowerCase();
  return PAUSED_OR_UNREACHABLE_PATTERNS.some((pattern) => lower.includes(pattern));
};

export const getUserFriendlySupabaseError = (error: unknown, fallback = "Something went wrong.") => {
  const rawMessage = error instanceof Error ? error.message : hasMessage(error) ? error.message : fallback;
  const message = normalizeMessage(rawMessage || fallback);

  if (looksLikeSupabasePaused(message)) {
    return `${message} ${SUPABASE_PAUSED_GUIDANCE}`;
  }

  return message;
};

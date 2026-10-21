import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Authenticate the caller before any GitHub App token is issued.
 * There is deliberately no anonymous or "all signed-in users" fallback.
 */
export async function authorizeGitHubApiRequest(
  request: Request,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const allowedUserIds = (process.env.GITHUB_EDITOR_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);

  if (!url || !anonKey || allowedUserIds.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "GitHub editing access is not configured." }, { status: 503 }),
    };
  }

  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data.user?.id) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid session." }, { status: 401 }),
      };
    }
    if (!allowedUserIds.includes(data.user.id.toLowerCase())) {
      return {
        ok: false,
        response: NextResponse.json({ error: "GitHub editor access denied." }, { status: 403 }),
      };
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unable to verify authentication." }, { status: 503 }),
    };
  }
  return { ok: true };
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SetupRequired } from "@/components/SetupRequired";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const completeAuth = async () => {
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description") || searchParams.get("error");

      if (errorDescription) {
        setMessage(`Sign-in failed: ${errorDescription}`);
        return;
      }

      if (!code) {
        setMessage("Invalid sign-in link. Please request a new email link.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage(`Could not complete sign-in: ${error.message}`);
        return;
      }

      router.replace("/");
      router.refresh();
    };

    completeAuth();
  }, [router, searchParams]);

  if (!isSupabaseConfigured) {
    return (
      <SetupRequired
        title="Authentication setup is incomplete"
        description="Sign-in requires Supabase environment variables to be configured first."
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="surface max-w-md p-4 text-sm text-muted">{message}</div>
    </div>
  );
}

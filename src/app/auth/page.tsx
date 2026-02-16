"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SetupRequired } from "@/components/SetupRequired";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  if (!isSupabaseConfigured) {
    return (
      <SetupRequired
        title="Authentication setup is incomplete"
        description="Sign-in requires Supabase environment variables to be configured first."
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center gap-3 p-4">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-base"
        placeholder="you@example.com"
      />
      <button onClick={signIn} className="btn-primary">
        Send OTP link
      </button>
      <button onClick={signOut} className="btn-ghost">
        Sign out
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SetupRequired } from "@/components/SetupRequired";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMsg(error.message);
      return;
    }

    setOtpSent(true);
    setCooldown(30);
    setMsg("OTP link sent. Check your inbox and spam folder.");
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
      <p className="text-sm text-muted">Use email OTP to continue to your notes.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-base"
        placeholder="you@example.com"
        disabled={otpSent}
      />

      {!otpSent ? (
        <button onClick={signIn} className="btn-primary" disabled={!email}>
          Send OTP link
        </button>
      ) : (
        <div className="surface space-y-2 p-3 text-sm">
          <p>Link sent to <strong>{email}</strong>.</p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setOtpSent(false)}>
              Edit email
            </button>
            <button className="btn-primary" onClick={signIn} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend link"}
            </button>
          </div>
        </div>
      )}

      <button onClick={signOut} className="btn-ghost">
        Sign out
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMsg(error ? error.message : "確認メールを送信しました");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col justify-center gap-3 p-4">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded bg-panel px-3 py-2"
        placeholder="you@example.com"
      />
      <button onClick={signIn} className="rounded bg-accent px-4 py-2 text-black">
        OTPでログイン
      </button>
      <button onClick={signOut} className="rounded bg-white/10 px-4 py-2">
        ログアウト
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { handleBulletListKeyDown } from "@/lib/bulletListEditor";
import { cheapHash } from "@/lib/noteUtils";
import { BottomSheet } from "@/components/BottomSheet";
import { Toast } from "@/components/Toast";
import { Note } from "@/types/db";

export default function HomePage() {
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "inbox" | "pinned">("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(
    async (search = query, nextFilter = filter) => {
      let q = supabase.from("notes").select("*").order("updated_at", { ascending: false }).limit(100);
      if (search) q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      if (nextFilter === "inbox") q = q.eq("inbox", true);
      if (nextFilter === "pinned") q = q.eq("pinned", true);
      const { data, error } = await q;
      if (error) return setToast(error.message);
      setNotes((data as Note[]) ?? []);
    },
    [filter, query]
  );

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.push("/auth");
      else await load();
    };
    run();
  }, [load, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [filter, load, query]);

  const similarCandidates = useMemo(() => {
    const kw = `${newTitle} ${newBody}`.trim().toLowerCase();
    if (!kw) return [];
    return notes
      .filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(kw) || n.title.toLowerCase().includes(newTitle.toLowerCase()))
      .slice(0, 6);
  }, [notes, newTitle, newBody]);

  const createNote = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("ログインが必要です");

      const body_hash = await cheapHash(newBody);
      const exact = notes.find((n) => n.body_hash === body_hash);
      if (exact) setToast(`完全一致の可能性: ${exact.title}`);
      const { data, error } = await supabase
        .from("notes")
        .insert({ title: newTitle || "Untitled", body: newBody, body_hash, inbox: true, pinned: false, user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      setOpenCreate(false);
      setNewTitle("");
      setNewBody("");
      await load();
      router.push(`/note/${data.id}`);
    } catch (error) {
      setToast((error as Error).message);
    }
  };

  const toggleFlag = async (id: string, patch: Partial<Pick<Note, "inbox" | "pinned">>) => {
    const { error } = await supabase.from("notes").update(patch).eq("id", id);
    if (error) setToast(error.message);
    await load();
  };

  const removeNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) setToast(error.message);
    await load();
  };

  const importNotes = async (files: FileList | null) => {
    if (!files?.length) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("ログインが必要です");

      let importedCount = 0;

      for (const file of Array.from(files)) {
        const body = await file.text();
        const title = file.name.replace(/\.[^.]+$/, "") || "Untitled";
        const body_hash = await cheapHash(body);
        const existing = notes.find((n) => n.title === title);

        if (existing) {
          const shouldOverwrite = window.confirm(`「${title}」は既に存在します。上書きしますか？`);
          if (!shouldOverwrite) continue;

          const { error } = await supabase
            .from("notes")
            .update({ body, body_hash, updated_at: new Date().toISOString() })
            .eq("id", existing.id);

          if (error) throw error;
          importedCount += 1;
          continue;
        }

        const { error } = await supabase
          .from("notes")
          .insert({ title, body, body_hash, inbox: true, pinned: false, user_id: user.id });

        if (error) throw error;
        importedCount += 1;
      }

      await load();
      setToast(importedCount > 0 ? `${importedCount}件インポートしました` : "インポートをスキップしました");
    } catch (error) {
      setToast((error as Error).message);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col gap-3 p-3 pb-24">
      <Toast message={toast} />
      <h1 className="text-2xl font-bold">Plexus</h1>
      <div>
        <input
          ref={importInputRef}
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          multiple
          className="hidden"
          onChange={(e) => {
            importNotes(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <button
          className="rounded-lg bg-white/10 px-3 py-2 text-sm"
          onClick={() => importInputRef.current?.click()}
        >
          インポート
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded-lg bg-panel px-3 py-2"
        placeholder="Search title/body"
      />
      <div className="flex gap-2 text-sm">
        {(["all", "inbox", "pinned"] as const).map((f) => (
          <button
            key={f}
            className={`rounded-full px-3 py-1 ${filter === f ? "bg-accent text-black" : "bg-white/10"}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-panel p-3">
            <Link href={`/note/${n.id}`} className="block font-semibold">
              {n.title || "Untitled"}
            </Link>
            <p className="line-clamp-2 text-sm text-muted">{n.body}</p>
            <div className="mt-2 flex gap-2 text-xs">
              <button onClick={() => toggleFlag(n.id, { inbox: !n.inbox })}>inbox:{String(n.inbox)}</button>
              <button onClick={() => toggleFlag(n.id, { pinned: !n.pinned })}>pinned:{String(n.pinned)}</button>
              <button onClick={() => removeNote(n.id)} className="text-red-300">delete</button>
            </div>
          </li>
        ))}
      </ul>
      <button
        className="fixed bottom-5 right-5 h-14 w-14 rounded-full bg-accent text-3xl text-black"
        onClick={() => setOpenCreate(true)}
      >
        +
      </button>
      <BottomSheet open={openCreate} onClose={() => setOpenCreate(false)} title="クイック作成">
        <div className="space-y-2">
          <input
            className="w-full rounded bg-white/10 px-3 py-2"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            ref={createBodyRef}
            className="min-h-28 w-full rounded bg-white/10 px-3 py-2"
            placeholder="Body"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            onKeyDown={(event) => {
              handleBulletListKeyDown({
                event,
                value: newBody,
                setValue: setNewBody,
                textareaRef: createBodyRef,
              });
            }}
          />
          <button onClick={createNote} className="w-full rounded bg-accent px-4 py-2 font-semibold text-black">
            作成
          </button>
          {similarCandidates.length > 0 && (
            <div>
              <p className="mb-1 text-sm text-muted">類似候補</p>
              <ul className="space-y-1 text-sm">
                {similarCandidates.map((item) => (
                  <li key={item.id} className="rounded bg-white/5 px-2 py-1">
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

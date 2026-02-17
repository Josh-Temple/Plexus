"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SetupRequired } from "@/components/SetupRequired";
import { handleBulletListKeyDown } from "@/lib/bulletListEditor";
import { cheapHash, extractWikiLinks } from "@/lib/noteUtils";
import { BottomSheet } from "@/components/BottomSheet";
import { Toast } from "@/components/Toast";
import { Note } from "@/types/db";

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "inbox", label: "Inbox" },
  { key: "pinned", label: "Pinned" },
] as const;

type FilterType = (typeof FILTER_OPTIONS)[number]["key"];

const SEARCH_SCOPE_OPTIONS = [
  { key: "title", label: "Title" },
  { key: "title_body", label: "Title + Body" },
] as const;

type SearchScope = (typeof SEARCH_SCOPE_OPTIONS)[number]["key"];

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");

export default function HomePage() {
  const router = useRouter();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>("title_body");
  const [filter, setFilter] = useState<FilterType>("all");
  const [openCreate, setOpenCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = useCallback(
    async (search = query, nextFilter = filter, nextScope = searchScope) => {
      let q = supabase.from("notes").select("*").order("updated_at", { ascending: false }).limit(100);
      if (search) {
        if (nextScope === "title") q = q.ilike("title", `%${search}%`);
        else q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      }
      if (nextFilter === "inbox") q = q.eq("inbox", true);
      if (nextFilter === "pinned") q = q.eq("pinned", true);

      const { data, error } = await q;
      if (error) return setToast(error.message);
      setNotes((data as Note[]) ?? []);
    },
    [filter, query, searchScope]
  );

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push("/auth");
      await load();
    };
    run();
  }, [load, router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const timer = setTimeout(() => {
      load(query, filter, searchScope);
    }, 250);
    return () => clearTimeout(timer);
  }, [filter, load, query, searchScope]);

  const formatUpdatedAt = (updatedAt: string) => {
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return "Updated just now";

    const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (Math.abs(diffMinutes) < 60) return `Updated ${relative.format(diffMinutes, "minute")}`;

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return `Updated ${relative.format(diffHours, "hour")}`;

    const diffDays = Math.round(diffHours / 24);
    return `Updated ${relative.format(diffDays, "day")}`;
  };

  const similarCandidates = useMemo(() => {
    const keyword = `${newTitle} ${newBody}`.trim().toLowerCase();
    if (!keyword) return [];

    return notes
      .filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(keyword))
      .slice(0, 5);
  }, [notes, newBody, newTitle]);

  const resetCreateForm = () => {
    setOpenCreate(false);
    setNewTitle("");
    setNewBody("");
  };

  const createNote = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You need to sign in.");

      const body_hash = await cheapHash(newBody);
      const exact = notes.find((note) => note.body_hash === body_hash);
      if (exact) setToast(`Possible duplicate: ${exact.title || "Untitled"}`);

      const { data, error } = await supabase
        .from("notes")
        .insert({ title: newTitle || "Untitled", body: newBody, body_hash, inbox: true, pinned: false, user_id: user.id })
        .select("id")
        .single();

      if (error) throw error;
      resetCreateForm();
      await load();
      router.push(`/note/${data.id}`);
    } catch (error) {
      setToast(getErrorMessage(error));
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
      if (!user) throw new Error("You need to sign in.");

      let importedCount = 0;

      for (const file of Array.from(files)) {
        const body = await file.text();
        const title = file.name.replace(/\.[^.]+$/, "") || "Untitled";
        const body_hash = await cheapHash(body);
        const existing = notes.find((note) => note.title === title);

        if (existing) {
          const shouldOverwrite = window.confirm(`"${title}" already exists. Overwrite it?`);
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
      setToast(importedCount > 0 ? `Imported ${importedCount} note(s).` : "Import skipped.");
    } catch (error) {
      setToast(getErrorMessage(error));
    }
  };

  const highlighted = (text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={`${part}-${index}`} className="rounded bg-amber-300/30 px-0.5 text-slate-100">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const applyBulk = async (action: "pin" | "inbox" | "delete") => {
    if (!selectedIds.length) return;

    let error: { message: string } | null = null;
    if (action === "delete") ({ error } = await supabase.from("notes").delete().in("id", selectedIds));
    if (action === "pin") ({ error } = await supabase.from("notes").update({ pinned: true }).in("id", selectedIds));
    if (action === "inbox") ({ error } = await supabase.from("notes").update({ inbox: true }).in("id", selectedIds));

    if (error) {
      setToast(error.message);
      return;
    }

    setSelectedIds([]);
    setSelectionMode(false);
    await load();
    setToast(`Bulk action applied: ${action}`);
  };

  if (!isSupabaseConfigured) {
    return <SetupRequired title="Plexus setup is incomplete" description="Home requires a configured Supabase project before notes can be loaded." />;
  }

  return (
    <div className="relative flex min-h-screen flex-col gap-4 p-4 pb-24">
      <Toast message={toast} />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plexus</h1>
          <p className="text-xs text-muted">Clarity-first notes</p>
        </div>
        <div className="flex items-center gap-2">
          <button className={selectionMode ? "btn-primary" : "btn-ghost"} onClick={() => setSelectionMode((v) => !v)}>
            Select
          </button>
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
          <button className="btn-ghost" onClick={() => importInputRef.current?.click()}>
            Import
          </button>
        </div>
      </header>

      {selectionMode && (
        <div className="surface flex items-center gap-2 p-2 text-xs">
          <span>{selectedIds.length} selected</span>
          <button className="btn-ghost px-2 py-1" onClick={() => applyBulk("pin")}>Pin</button>
          <button className="btn-ghost px-2 py-1" onClick={() => applyBulk("inbox")}>Inbox</button>
          <button className="rounded-lg px-2 py-1 text-red-300 hover:bg-red-500/10" onClick={() => applyBulk("delete")}>Delete</button>
        </div>
      )}

      <div className="surface p-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="input-base" placeholder="Search notes" />
        <div className="mt-3 flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button key={option.key} className={filter === option.key ? "btn-primary" : "btn-ghost"} onClick={() => setFilter(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {SEARCH_SCOPE_OPTIONS.map((scope) => (
            <button key={scope.key} className={searchScope === scope.key ? "btn-primary" : "btn-ghost"} onClick={() => setSearchScope(scope.key)}>
              {scope.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="surface p-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/note/${note.id}`} className="block text-base font-medium">
                {highlighted(note.title || "Untitled")}
              </Link>
              {selectionMode && (
                <input type="checkbox" checked={selectedIds.includes(note.id)} onChange={() => toggleSelected(note.id)} />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{highlighted(note.body)}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-white/10 px-2 py-1">{formatUpdatedAt(note.updated_at)}</span>
              {note.inbox && <span className="rounded-full border border-cyan-300/30 px-2 py-1 text-cyan-200">Inbox</span>}
              {note.pinned && <span className="rounded-full border border-amber-300/30 px-2 py-1 text-amber-200">Pinned</span>}
              <span className="rounded-full border border-white/10 px-2 py-1">{extractWikiLinks(note.body).length} wiki link(s)</span>
            </div>
            {!selectionMode && (
              <div className="mt-3 flex gap-2 text-xs">
                <button className="btn-ghost" onClick={() => toggleFlag(note.id, { inbox: !note.inbox })}>{note.inbox ? "Remove inbox" : "Move to inbox"}</button>
                <button className="btn-ghost" onClick={() => toggleFlag(note.id, { pinned: !note.pinned })}>{note.pinned ? "Unpin" : "Pin"}</button>
                <button className="rounded-xl px-3 py-2 text-red-300 hover:bg-red-500/10" onClick={() => removeNote(note.id)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <button className="fixed bottom-5 right-5 h-12 w-12 rounded-full border border-white/20 bg-panel text-2xl text-slate-100" onClick={() => setOpenCreate(true)} aria-label="Create note">+
      </button>

      <BottomSheet open={openCreate} onClose={resetCreateForm} title="Quick note">
        <div className="space-y-3">
          <input className="input-base" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <textarea
            ref={createBodyRef}
            className="input-base min-h-28"
            placeholder="Write your note"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            onKeyDown={(event) =>
              handleBulletListKeyDown({
                event,
                value: newBody,
                setValue: setNewBody,
                textareaRef: createBodyRef,
              })
            }
          />
          <button onClick={createNote} className="btn-primary w-full">Create note</button>
          {similarCandidates.length > 0 && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Similar notes</p>
              <ul className="space-y-1 text-sm">
                {similarCandidates.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 px-2 py-1">{item.title || "Untitled"}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

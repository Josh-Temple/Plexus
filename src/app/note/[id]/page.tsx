"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { NoteEditor } from "@/components/NoteEditor";
import { Toast } from "@/components/Toast";
import { extractWikiLinks, cheapHash } from "@/lib/noteUtils";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { SetupRequired } from "@/components/SetupRequired";
import { Note } from "@/types/db";

type LinkRow = { id: string; from_note_id: string; to_note_id: string; notes?: { title: string } | null };
type RawLinkRow = Omit<LinkRow, "notes"> & { notes?: { title: string } | { title: string }[] | null };
type SaveState = "saving" | "saved" | "error";

const normalizeLinkRows = (rows: RawLinkRow[] | null | undefined): LinkRow[] =>
  (rows ?? []).map((row) => ({
    ...row,
    notes: Array.isArray(row.notes) ? row.notes[0] ?? null : row.notes ?? null,
  }));

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");

const getUniqueLinkTitles = (body: string) => [...new Set(extractWikiLinks(body))];

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [backlinks, setBacklinks] = useState<LinkRow[]>([]);
  const [outgoing, setOutgoing] = useState<LinkRow[]>([]);
  const [openSheet, setOpenSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [insertRequest, setInsertRequest] = useState<{ title: string; nonce: number } | null>(null);

  const load = useCallback(async () => {
    const [{ data: single }, { data: notes }, { data: back }, { data: out }] = await Promise.all([
      supabase.from("notes").select("*").eq("id", params.id).single(),
      supabase.from("notes").select("*").order("updated_at", { ascending: false }).limit(50),
      supabase.from("links").select("id,from_note_id,to_note_id,notes:from_note_id(title)").eq("to_note_id", params.id),
      supabase.from("links").select("id,from_note_id,to_note_id,notes:to_note_id(title)").eq("from_note_id", params.id),
    ]);

    setNote(single as Note);
    setAllNotes((notes as Note[]) ?? []);
    setBacklinks(normalizeLinkRows(back as RawLinkRow[] | null));
    setOutgoing(normalizeLinkRows(out as RawLinkRow[] | null));
  }, [params.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    load();
  }, [load]);

  const onAutoSave = async (patch: Pick<Note, "title" | "body" | "body_hash">) => {
    const body_hash = await cheapHash(patch.body);
    const { error } = await supabase
      .from("notes")
      .update({ title: patch.title, body: patch.body, body_hash, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (error) {
      setToast(error.message);
      throw error;
    }
  };

  const onSyncLinks = async (body: string) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setToast(userError.message);
      throw userError;
    }
    if (!user) {
      const authError = new Error("You need to sign in.");
      setToast(authError.message);
      throw authError;
    }

    const parsed = getUniqueLinkTitles(body);
    const resolved = parsed
      .map((title) => {
        const hits = allNotes.filter((item) => item.title === title);
        if (hits.length !== 1) return null;
        return hits[0].id;
      })
      .filter(Boolean) as string[];

    const { data: existing, error } = await supabase.from("links").select("id,to_note_id").eq("from_note_id", params.id);
    if (error) {
      setToast(error.message);
      throw error;
    }

    const have = new Set((existing ?? []).map((item) => item.to_note_id));
    const want = new Set(resolved);

    const toDelete = (existing ?? []).filter((item) => !want.has(item.to_note_id)).map((item) => item.id);
    if (toDelete.length) await supabase.from("links").delete().in("id", toDelete);

    const toInsert = [...want].filter((target) => !have.has(target));
    if (toInsert.length) {
      await supabase.from("links").insert(toInsert.map((to_note_id) => ({ from_note_id: params.id, to_note_id, user_id: user.id })));
    }

    await load();
  };

  const related = useMemo(() => {
    if (!note) return [];

    const words = new Set(`${note.title} ${note.body}`.toLowerCase().split(/\W+/).filter(Boolean));
    return allNotes
      .filter((item) => item.id !== note.id)
      .map((item) => {
        const titleOverlap = item.title
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => words.has(token)).length;
        const bodyOverlap = item.body
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => words.has(token)).length;

        return { item, score: titleOverlap * 3 + bodyOverlap };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [allNotes, note]);

  const linkTitleStats = useMemo(() => {
    if (!note) return [];

    return getUniqueLinkTitles(note.body).map((title) => ({ title, hits: allNotes.filter((item) => item.title === title) }));
  }, [allNotes, note]);

  const unresolved = linkTitleStats.filter((item) => item.hits.length === 0);
  const ambiguous = linkTitleStats.filter((item) => item.hits.length > 1);

  const resolveWikiLink = useCallback(
    (title: string) => {
      const hits = allNotes.filter((item) => item.title === title);
      if (hits.length === 1) return { href: `/note/${hits[0].id}`, status: "resolved" as const };
      if (hits.length > 1) return { href: "#", status: "ambiguous" as const };
      return { href: "#", status: "unresolved" as const };
    },
    [allNotes]
  );

  const createUnresolved = async (title: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const authError = new Error("You need to sign in.");
        setToast(authError.message);
        throw authError;
      }

      const body_hash = await cheapHash("");
      const { data, error } = await supabase
        .from("notes")
        .insert({ title, body: "", body_hash, inbox: true, pinned: false, user_id: user.id })
        .select("id")
        .single();

      if (error) throw error;
      setToast(`Created note: ${title}`);
      await load();
      router.push(`/note/${data.id}`);
    } catch (error) {
      setToast(getErrorMessage(error));
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <SetupRequired
        title="Note view is unavailable"
        description="This page needs Supabase env configuration before notes can be opened."
      />
    );
  }

  if (!note) return <div className="p-4 text-sm text-muted">Loading…</div>;

  return (
    <div className="p-4 pb-24">
      <Toast message={toast} />
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted">
          ← Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${saveState === "saving" ? "bg-amber-300" : saveState === "error" ? "bg-rose-400" : "bg-emerald-300"}`} />{saveState === "saving" ? "Saving..." : saveState === "error" ? "Save failed" : "Saved"}</span>
          <button className="btn-ghost" onClick={() => setOpenSheet(true)}>
            Connections
          </button>
        </div>
      </div>
      <NoteEditor
        note={note}
        candidates={allNotes}
        insertRequest={insertRequest}
        resolveWikiLink={resolveWikiLink}
        onAutoSave={onAutoSave}
        onSyncLinks={onSyncLinks}
        onNotify={setToast}
        onSaveStateChange={setSaveState}
      />
      <BottomSheet open={openSheet} onClose={() => setOpenSheet(false)} title="Connections">
        <section className="mb-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Related</h3>
          <ul className="space-y-1 text-sm">
            {related.map(({ item }) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <Link href={`/note/${item.id}`}>{item.title}</Link>
                <button className="btn-ghost px-2 py-1" onClick={() => setInsertRequest({ title: item.title, nonce: Date.now() })}>
                  Insert
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="mb-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Backlinks</h3>
          <ul className="space-y-1 text-sm">
            {backlinks.map((item) => (
              <li key={item.id}>{item.notes?.title ?? item.from_note_id}</li>
            ))}
          </ul>
        </section>
        <section className="mb-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Outgoing</h3>
          <ul className="space-y-1 text-sm">
            {outgoing.map((item) => (
              <li key={item.id}>{item.notes?.title ?? item.to_note_id}</li>
            ))}
          </ul>
        </section>
        <section className="mb-4">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Ambiguous wiki links</h3>
          <ul className="space-y-2 text-sm">
            {ambiguous.length === 0 && <li className="text-muted">No ambiguous links.</li>}
            {ambiguous.map((entry) => (
              <li key={`amb-${entry.title}`} className="rounded-lg border border-amber-400/30 p-2">
                <p className="mb-1">[[{entry.title}]] matches multiple notes:</p>
                <div className="flex flex-wrap gap-2">
                  {entry.hits.map((hit) => (
                    <Link key={hit.id} href={`/note/${hit.id}`} className="btn-ghost px-2 py-1 text-xs">
                      {hit.title} ({hit.id.slice(0, 6)})
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Unresolved links</h3>
          <ul className="space-y-2 text-sm">
            {unresolved.length === 0 && <li className="text-muted">No unresolved links.</li>}
            {unresolved.map((entry) => (
              <li key={`un-${entry.title}`} className="flex items-center justify-between rounded-lg border border-white/10 p-2">
                <span>[[{entry.title}]]</span>
                <button className="btn-primary px-2 py-1" onClick={() => createUnresolved(entry.title)}>
                  Create
                </button>
              </li>
            ))}
          </ul>
        </section>
      </BottomSheet>
    </div>
  );
}

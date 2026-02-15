"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { NoteEditor } from "@/components/NoteEditor";
import { Toast } from "@/components/Toast";
import { extractWikiLinks, cheapHash } from "@/lib/noteUtils";
import { supabase } from "@/lib/supabaseClient";
import { Note } from "@/types/db";

type LinkRow = { id: string; from_note_id: string; to_note_id: string; notes?: { title: string } | null };

export default function NotePage() {
  const params = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [backlinks, setBacklinks] = useState<LinkRow[]>([]);
  const [outgoing, setOutgoing] = useState<LinkRow[]>([]);
  const [openSheet, setOpenSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    const [{ data: single }, { data: notes }, { data: back }, { data: out }] = await Promise.all([
      supabase.from("notes").select("*").eq("id", params.id).single(),
      supabase.from("notes").select("*").order("updated_at", { ascending: false }).limit(50),
      supabase.from("links").select("id,from_note_id,to_note_id,notes:from_note_id(title)").eq("to_note_id", params.id),
      supabase.from("links").select("id,from_note_id,to_note_id,notes:to_note_id(title)").eq("from_note_id", params.id),
    ]);
    setNote(single as Note);
    setAllNotes((notes as Note[]) ?? []);
    setBacklinks((back as LinkRow[]) ?? []);
    setOutgoing((out as LinkRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const onAutoSave = async (patch: Pick<Note, "title" | "body" | "body_hash">) => {
    try {
      const body_hash = await cheapHash(patch.body);
      const { error } = await supabase
        .from("notes")
        .update({ title: patch.title, body: patch.body, body_hash, updated_at: new Date().toISOString() })
        .eq("id", params.id);
      if (error) setToast(error.message);
    } catch (error) {
      setToast((error as Error).message);
    }
  };

  const onSyncLinks = async (body: string) => {
    const parsed = extractWikiLinks(body);
    const resolved = parsed
      .map((title) => {
        const hit = allNotes.find((n) => n.title === title);
        if (!hit) return null;
        return hit.id;
      })
      .filter(Boolean) as string[];

    const { data: existing, error } = await supabase.from("links").select("id,to_note_id").eq("from_note_id", params.id);
    if (error) return setToast(error.message);

    const have = new Set((existing ?? []).map((l) => l.to_note_id));
    const want = new Set(resolved);

    const toDelete = (existing ?? []).filter((l) => !want.has(l.to_note_id)).map((l) => l.id);
    if (toDelete.length) await supabase.from("links").delete().in("id", toDelete);

    const toInsert = [...want].filter((target) => !have.has(target));
    if (toInsert.length) {
      await supabase.from("links").insert(
        toInsert.map((to_note_id) => ({ from_note_id: params.id, to_note_id }))
      );
    }

    if (parsed.some((t) => allNotes.filter((n) => n.title === t).length > 1)) {
      console.warn("multiple title matches found; picked first.");
    }

    await load();
  };

  const related = useMemo(() => {
    if (!note) return [];
    const words = new Set(`${note.title} ${note.body}`.toLowerCase().split(/\W+/).filter(Boolean));
    return allNotes
      .filter((item) => item.id !== note.id)
      .map((item) => {
        const overlap = item.body
          .toLowerCase()
          .split(/\W+/)
          .filter((token) => words.has(token)).length;
        return { item, score: overlap };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [allNotes, note]);

  if (!note) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-3">
      <Toast message={toast} />
      <div className="mb-2 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted">← Home</Link>
        <button className="rounded bg-white/10 px-3 py-1 text-sm" onClick={() => setOpenSheet(true)}>
          Links
        </button>
      </div>
      <NoteEditor note={note} candidates={allNotes} onAutoSave={onAutoSave} onSyncLinks={onSyncLinks} />
      <BottomSheet open={openSheet} onClose={() => setOpenSheet(false)} title="Connections">
        <section className="mb-4">
          <h3 className="mb-1 font-semibold">Related</h3>
          <ul className="space-y-1 text-sm">
            {related.map(({ item }) => (
              <li key={item.id}><Link href={`/note/${item.id}`}>{item.title}</Link></li>
            ))}
          </ul>
        </section>
        <section className="mb-4">
          <h3 className="mb-1 font-semibold">Backlinks</h3>
          <ul className="space-y-1 text-sm">
            {backlinks.map((item) => (
              <li key={item.id}>{item.notes?.title ?? item.from_note_id}</li>
            ))}
          </ul>
        </section>
        <section className="mb-4">
          <h3 className="mb-1 font-semibold">Outgoing</h3>
          <ul className="space-y-1 text-sm">
            {outgoing.map((item) => (
              <li key={item.id}>{item.notes?.title ?? item.to_note_id}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-semibold">To connect</h3>
          <ul className="space-y-1 text-sm">
            {related
              .filter(({ item }) => !outgoing.some((o) => o.to_note_id === item.id))
              .map(({ item }) => (
                <li key={item.id}>{item.title}</li>
              ))}
          </ul>
        </section>
      </BottomSheet>
    </div>
  );
}

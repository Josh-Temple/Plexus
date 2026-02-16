"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Note } from "@/types/db";
import { markdownLite } from "@/lib/noteUtils";
import { handleBulletListKeyDown } from "@/lib/bulletListEditor";
import { SuggestBar } from "./SuggestBar";

type Props = {
  note: Note;
  candidates: Note[];
  onAutoSave: (patch: Pick<Note, "title" | "body" | "body_hash">) => Promise<void>;
  onSyncLinks: (body: string) => Promise<void>;
};

export function NoteEditor({ note, candidates, onAutoSave, onSyncLinks }: Props) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [preview, setPreview] = useState(true);
  const [showSuggest, setShowSuggest] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const loadedNoteIdRef = useRef(note.id);

  useEffect(() => {
    if (loadedNoteIdRef.current === note.id) return;

    loadedNoteIdRef.current = note.id;
    setTitle(note.title);
    setBody(note.body);
    setPreview(true);
    setShowSuggest(false);
  }, [note.id, note.body, note.title]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      await onAutoSave({ title, body, body_hash: note.body_hash });
      await onSyncLinks(body);
    }, 500);

    return () => clearTimeout(timer);
  }, [title, body, onAutoSave, onSyncLinks, note.body_hash]);

  const suggestions = useMemo(() => {
    const token = body.split("[[").pop()?.toLowerCase() ?? "";
    if (!showSuggest) return [];

    return candidates
      .filter((item) => item.id !== note.id)
      .filter((item) => item.title.toLowerCase().includes(token) || item.body.toLowerCase().includes(token))
      .slice(0, 8);
  }, [body, candidates, note.id, showSuggest]);

  const onEnterBullet = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    handleBulletListKeyDown({
      event,
      value: body,
      setValue: setBody,
      textareaRef,
    });
  };

  const onPickSuggestion = (picked: Note) => {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const before = body.slice(0, cursor);
    const after = body.slice(cursor);
    const replaced = before.replace(/\[\[[^\[]*$/, `[[${picked.title}]]`);
    setBody(`${replaced}${after}`);
    setShowSuggest(false);
  };

  return (
    <section className="flex h-full flex-col gap-3 pb-16">
      <div className="surface space-y-3 p-4 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Note</p>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setPreview((value) => !value)}>
            {preview ? "Switch to Edit" : "Switch to Preview"}
          </button>
        </div>

        {preview ? (
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Title</p>
            <p className="mt-1 text-2xl font-semibold leading-tight text-slate-50">{title || "Untitled note"}</p>
          </button>
        ) : (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="input-base border-white/20 bg-white/[0.03] text-2xl font-semibold leading-tight"
          />
        )}

        {preview ? (
          <button
            type="button"
            onClick={() => setPreview(false)}
            className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-left"
          >
            <article
              className="markdown-preview max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownLite(body) || "<p class='text-muted'>Tap to edit your note</p>" }}
            />
          </button>
        ) : (
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setShowSuggest(e.target.value.slice(0, e.target.selectionStart).includes("[["));
            }}
            onKeyDown={onEnterBullet}
            placeholder="Write your note"
            className="input-base min-h-[55vh] border-white/20 bg-white/[0.03] p-3"
          />
        )}
      </div>
      <SuggestBar visible={showSuggest} suggestions={suggestions} onSelect={onPickSuggestion} />
    </section>
  );
}

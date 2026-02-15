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
  const [preview, setPreview] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
  }, [note.body, note.title, note.id]);

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
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="input-base text-base" />
      <button className="btn-ghost self-start" onClick={() => setPreview((value) => !value)}>
        {preview ? "Edit" : "Preview"}
      </button>
      {preview ? (
        <article
          className="surface prose prose-invert max-w-none p-3"
          dangerouslySetInnerHTML={{ __html: markdownLite(body) }}
        />
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
          className="input-base min-h-[55vh] p-3"
        />
      )}
      <SuggestBar visible={showSuggest} suggestions={suggestions} onSelect={onPickSuggestion} />
    </section>
  );
}

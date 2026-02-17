"use client";

import { Note } from "@/types/db";

type Props = {
  visible: boolean;
  suggestions: Note[];
  onSelect: (note: Note) => void;
  bottomOffsetClassName?: string;
};

export function SuggestBar({ visible, suggestions, onSelect, bottomOffsetClassName = "bottom-0" }: Props) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className={`fixed left-0 right-0 z-30 border-t border-white/10 bg-panel/95 px-3 py-2 backdrop-blur ${bottomOffsetClassName}`}>
      <div className="mx-auto flex max-w-xl gap-2 overflow-x-auto">
        {suggestions.map((item) => (
          <button key={item.id} onClick={() => onSelect(item)} className="btn-ghost whitespace-nowrap py-1">
            {item.title || "(untitled)"}
          </button>
        ))}
      </div>
    </div>
  );
}

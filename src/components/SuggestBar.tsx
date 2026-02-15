"use client";

import { Note } from "@/types/db";

type Props = {
  visible: boolean;
  suggestions: Note[];
  onSelect: (note: Note) => void;
};

export function SuggestBar({ visible, suggestions, onSelect }: Props) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-panel px-3 py-2">
      <div className="mx-auto flex max-w-xl gap-2 overflow-x-auto">
        {suggestions.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="whitespace-nowrap rounded-full bg-white/10 px-3 py-1 text-sm"
          >
            {item.title || "(untitled)"}
          </button>
        ))}
      </div>
    </div>
  );
}

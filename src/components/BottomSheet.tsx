"use client";

import { useRef } from "react";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const dragStartRef = useRef<number | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <section
        aria-label={title}
        className="surface absolute bottom-0 left-0 right-0 mx-auto flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(event) => {
          dragStartRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(event) => {
          if (dragStartRef.current === null) return;
          const end = event.changedTouches[0]?.clientY ?? dragStartRef.current;
          if (end - dragStartRef.current > 60) onClose();
          dragStartRef.current = null;
        }}
      >
        <div className="mb-3 mx-auto h-1.5 w-10 rounded-full bg-white/30" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto pb-2">{children}</div>
      </section>
    </div>
  );
}

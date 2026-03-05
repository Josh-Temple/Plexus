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
  const dragDistanceRef = useRef(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <section
        aria-label={title}
        className="surface absolute bottom-0 left-0 right-0 mx-auto flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Drag to close"
          className="mb-3 mx-auto flex w-full justify-center"
          onTouchStart={(event) => {
            dragStartRef.current = event.touches[0]?.clientY ?? null;
            dragDistanceRef.current = 0;
          }}
          onTouchMove={(event) => {
            if (dragStartRef.current === null) return;
            const current = event.touches[0]?.clientY ?? dragStartRef.current;
            dragDistanceRef.current = current - dragStartRef.current;
          }}
          onTouchEnd={() => {
            if (dragDistanceRef.current > 60) onClose();
            dragStartRef.current = null;
            dragDistanceRef.current = 0;
          }}
        >
          <span className="h-1.5 w-10 rounded-full bg-white/30" />
        </button>
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

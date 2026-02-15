"use client";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <section
        aria-label={title}
        className="surface absolute bottom-0 left-0 right-0 mx-auto max-h-[75vh] w-full max-w-xl rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

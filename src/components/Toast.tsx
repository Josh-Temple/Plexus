"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded bg-white px-4 py-2 text-sm text-black shadow-lg">
      {message}
    </div>
  );
}

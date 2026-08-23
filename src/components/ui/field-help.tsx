"use client";

import { useEffect, useId, useRef, useState } from "react";

export function FieldHelp({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <span className="relative inline-block align-middle" ref={rootRef}>
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`Подсказка: ${label}`}
        className="ml-1 inline-grid size-5 place-items-center rounded-full border border-white/20 text-[0.65rem] font-black text-neutral-400 transition hover:border-[var(--accent-cool)] hover:text-[var(--accent-cool)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        ?
      </button>
      {open ? (
        <span
          className="absolute left-0 top-7 z-30 w-64 rounded-xl border border-white/15 bg-[#10100e] p-3 text-xs font-normal leading-5 text-neutral-300 shadow-2xl"
          id={popoverId}
          role="tooltip"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

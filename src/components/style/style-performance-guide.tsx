"use client";

import { useEffect, useId, useState } from "react";
import {
  PERFORMANCE_GUIDE_ROLE_LABELS,
  PERFORMANCE_GUIDE_ROLES,
  stylePerformanceGuide,
} from "@/data/style-performance-guides";

export function StylePerformanceGuide({
  styleId,
  className = "",
  compact = false,
}: {
  styleId: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const guide = stylePerformanceGuide(styleId);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {compact ? "Как играть" : `Как играть ${guide.name}`}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setOpen(false);
          }}
          role="presentation"
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-white/15 bg-[#171714] p-5 text-left text-white shadow-2xl sm:max-w-4xl sm:rounded-3xl sm:p-8"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">
                  Быстрая памятка для джема
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl" id={titleId}>
                  Как играть {guide.name}
                </h2>
              </div>
              <button
                aria-label="Закрыть подсказки"
                className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xl font-black text-neutral-300 transition hover:border-white/40 hover:text-white active:scale-95"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>

            <p className="mt-5 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.06] p-4 text-base font-semibold leading-7 text-neutral-200 sm:p-5 sm:text-lg">
              {guide.groove}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PERFORMANCE_GUIDE_ROLES.map((role) => (
                <article
                  className="rounded-2xl border border-white/10 bg-black/25 p-4"
                  key={role}
                >
                  <h3 className="font-black text-[var(--accent-cool)]">
                    {PERFORMANCE_GUIDE_ROLE_LABELS[role]}
                  </h3>
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-neutral-300">
                    {guide.roles[role].map((tip) => (
                      <li className="flex gap-2" key={tip}>
                        <span aria-hidden="true" className="text-[var(--accent)]">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

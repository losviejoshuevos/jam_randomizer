"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";

const QUICK_START_STORAGE_KEY = "jam-randomizer:quick-start-seen:v1";
const subscribeToHydration = () => () => undefined;

function quickStartWasSeen(): boolean {
  try {
    return window.localStorage.getItem(QUICK_START_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

const STEPS = [
  {
    number: "1",
    title: "Настройте сессию",
    text: "Выберите стиль, форму и параметры тем или доверьте всё колесу рандома.",
  },
  {
    number: "2",
    title: "Откройте сценический режим",
    text: "Проверьте аккорды и нажмите «На сцену», когда музыканты будут готовы.",
  },
  {
    number: "3",
    title: "Подключите музыкантов",
    text: "В Stage Mode откройте подключение и покажите QR-код участникам джема.",
  },
] as const;

export function QuickStartGuide() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [manuallyOpened, setManuallyOpened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const titleId = useId();
  const seen = hydrated ? quickStartWasSeen() : true;
  const open = manuallyOpened || (hydrated && !seen && !dismissed);

  const closeGuide = useCallback(() => {
    try {
      window.localStorage.setItem(QUICK_START_STORAGE_KEY, "1");
    } catch {
      // The guide can still be closed when browser storage is unavailable.
    }
    setDismissed(true);
    setManuallyOpened(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuide();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeGuide, open]);

  return (
    <>
      <button
        className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:border-[var(--accent-cool)] hover:text-[var(--accent-cool)] active:scale-95"
        onClick={() => setManuallyOpened(true)}
        type="button"
      >
        Как начать
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[140] flex items-end justify-center bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeGuide();
          }}
          role="presentation"
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="w-full rounded-t-3xl border border-white/15 bg-[#171714] p-5 text-left shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-8"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--accent)]">
                  Быстрый старт
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl" id={titleId}>
                  От настройки до джема
                </h2>
              </div>
              <button
                aria-label="Закрыть быстрый старт"
                className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-xl font-black text-neutral-300 transition hover:border-white/40 hover:text-white active:scale-95"
                onClick={closeGuide}
                type="button"
              >
                ×
              </button>
            </div>

            <ol className="mt-7 grid gap-3 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li className="rounded-2xl border border-white/10 bg-black/25 p-4" key={step.number}>
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--accent)] font-black text-black">
                    {step.number}
                  </span>
                  <h3 className="mt-4 font-black text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{step.text}</p>
                </li>
              ))}
            </ol>

            <button
              className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-6 py-4 font-black text-black transition hover:brightness-110 active:scale-[0.99]"
              onClick={closeGuide}
              type="button"
            >
              Понятно, начинаем
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

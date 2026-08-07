"use client";

import { useEffect, useState } from "react";
import type { JamSection, JamSession } from "@/lib/music/domain/types";
import { createJamPersistence } from "@/lib/persistence/local-storage";
import { RouteLink } from "@/components/ui/route-link";
import { formatRomanChord } from "@/lib/music/rendering/format-roman-chord";
import { formatChordDuration } from "@/lib/music/rendering/format-chord-duration";
import { groupChordsForDisplay } from "@/lib/music/rendering/group-chords-for-display";

interface PlaybackState {
  stepIndex: number;
  remainingSeconds: number;
  running: boolean;
  completed: boolean;
}

function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutesPart = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsPart = (seconds % 60).toString().padStart(2, "0");

  return `${minutesPart}:${secondsPart}`;
}

function formatSectionSettings(section: JamSection): string {
  const settings = section.harmonySettings;
  if (!settings) return "";

  return `${settings.key} ${settings.mode === "major" ? "мажор" : "минор"} · ${settings.complexity} · ${settings.harmonicFreedom}`;
}

function SectionGrid({
  section,
  compact = false,
}: {
  section: JamSection;
  compact?: boolean;
}) {
  const chordGroups = groupChordsForDisplay(section.chords);
  const isSingleChord =
    chordGroups.length === 1 && chordGroups[0]?.chords.length === 1;
  const columnClass = compact
    ? section.chords.length === 1
      ? "grid-cols-1"
      : "grid-cols-2"
    : section.chords.length === 1
      ? "grid-cols-1"
      : section.chords.length === 2
        ? "sm:grid-cols-2"
        : section.chords.length === 3
          ? "sm:grid-cols-2 xl:grid-cols-3"
        : "sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`grid h-full auto-rows-fr gap-3 ${columnClass}`}>
      {chordGroups.map((group) => {
        if (group.chords.length === 2) {
          return (
            <div
              className="stage-card relative col-span-2 grid min-w-0 grid-cols-2 overflow-hidden rounded-2xl border border-[var(--accent)]/30 shadow-[0_0_28px_rgba(220,255,65,0.06)]"
              key={group.id}
            >
              <div className={`stage-bars absolute right-3 top-3 z-10 whitespace-nowrap rounded-full border border-[var(--accent)]/50 bg-[#161a0d] font-black uppercase text-[var(--accent)] shadow-[0_0_24px_rgba(220,255,65,0.18)] ${compact ? "px-3 py-1 text-xs" : "px-5 py-2 text-base sm:text-xl"}`}>
                1 такт · ½ + ½
              </div>
              {group.chords.map((chord, halfIndex) => (
                <div
                  className={`flex min-w-0 flex-col justify-center [container-type:inline-size] ${halfIndex === 0 ? "border-r border-white/15" : ""} ${compact ? "p-3 pt-12" : "p-4 pt-16 sm:p-5 sm:pt-20"}`}
                  key={chord.id}
                >
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{group.startIndex + halfIndex + 1}</span>
                    <span className={`${compact ? "text-sm" : "text-lg sm:text-2xl"} font-black uppercase tracking-[0.08em] text-[var(--accent)]`}>
                      {halfIndex === 0 ? "1-я половина" : "2-я половина"}
                    </span>
                  </div>
                  <p
                    className={`mt-4 min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${
                      compact
                        ? "text-2xl"
                        : chord.renderedSymbol.length > 5
                          ? "text-[clamp(2rem,18cqw,9rem)]"
                          : "text-[clamp(3rem,30cqw,12rem)]"
                    }`}
                  >
                    {chord.renderedSymbol}
                  </p>
                  <p className={`${compact ? "text-xs" : "text-xl"} mt-3 font-semibold tracking-[0.12em] text-neutral-400`}>
                    {formatRomanChord(chord.roman)}
                  </p>
                </div>
              ))}
            </div>
          );
        }

        const chord = group.chords[0];
        if (!chord) return null;

        return (
          <div
            className={`stage-card relative min-w-0 overflow-hidden rounded-2xl border border-white/10 [container-type:inline-size] ${compact ? "p-3" : `flex flex-col justify-center p-4 sm:p-5 ${isSingleChord ? "items-center text-center" : ""}`}`}
            key={group.id}
          >
            <span className="absolute left-3 top-3 text-xs text-neutral-500 sm:left-5 sm:top-5">
              {group.startIndex + 1}
            </span>
            <span className={`absolute right-3 top-3 z-10 ${compact ? "font-black text-[var(--accent)]" : "stage-bars rounded-2xl border border-[var(--accent)]/40 bg-[#161a0d] px-5 py-3 text-2xl font-black text-[var(--accent)] shadow-[0_0_24px_rgba(220,255,65,0.18)] sm:right-5 sm:top-5 sm:text-4xl"}`}>
                {formatChordDuration(chord.durationBars).toUpperCase()}
            </span>
            <p
              className={`min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${
                compact
                  ? "text-2xl"
                  : chord.renderedSymbol.length > 5
                    ? "text-[clamp(2rem,18cqw,9rem)]"
                    : "text-[clamp(3rem,30cqw,12rem)]"
              }`}
            >
              {chord.renderedSymbol}
            </p>
            <p className={`${compact ? "text-xs" : "text-xl"} mt-3 font-semibold tracking-[0.12em] text-neutral-400`}>
              {formatRomanChord(chord.roman)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function initialPlayback(session: JamSession): PlaybackState {
  return {
    stepIndex: 0,
    remainingSeconds: session.timeline[0]?.durationSeconds ?? 0,
    running: false,
    completed: false,
  };
}

export function StageSession() {
  const [session, setSession] = useState<JamSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>({
    stepIndex: 0,
    remainingSeconds: 0,
    running: false,
    completed: false,
  });

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const loaded = createJamPersistence(window.localStorage).load();

      if (!loaded.ok || !loaded.value?.currentSession) {
        setLoadError(
          "Сохранённая сессия не найдена. Создайте карточку в редакторе.",
        );
        return;
      }

      setSession(loaded.value.currentSession);
      setPlayback(initialPlayback(loaded.value.currentSession));
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!session || !playback.running) {
      return;
    }

    const timer = window.setInterval(() => {
      setPlayback((current) => {
        if (!current.running) return current;
        if (current.remainingSeconds > 1) {
          return { ...current, remainingSeconds: current.remainingSeconds - 1 };
        }

        const nextStepIndex = current.stepIndex + 1;
        const nextStep = session.timeline[nextStepIndex];

        if (!nextStep) {
          return {
            ...current,
            remainingSeconds: 0,
            running: false,
            completed: true,
          };
        }

        return {
          stepIndex: nextStepIndex,
          remainingSeconds: nextStep.durationSeconds,
          running: true,
          completed: false,
        };
      });
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [playback.running, session]);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
          Stage Mode
        </p>
        <h1 className="text-4xl font-black">Нет активной сессии</h1>
        <p className="max-w-xl text-neutral-400">
          {loadError ?? "Загружаю последнюю локальную сессию…"}
        </p>
        <RouteLink href="/">Вернуться в редактор</RouteLink>
      </main>
    );
  }

  const activeSession = session;
  const currentStep = session.timeline[playback.stepIndex];
  const nextStep = session.timeline[playback.stepIndex + 1];
  const currentSection = session.sections.find(
    ({ id }) => id === currentStep?.sectionId,
  );
  const nextSection = session.sections.find(({ id }) => id === nextStep?.sectionId);
  const warningActive =
    playback.running &&
    Boolean(nextStep) &&
    playback.remainingSeconds <= currentStep.transitionWarningSeconds;

  if (!currentSection) {
    return null;
  }

  function resetPlayback() {
    setPlayback(initialPlayback(activeSession));
  }

  function moveToNextStep() {
    setPlayback((current) => {
      const nextStepIndex = current.stepIndex + 1;
      const nextStep = activeSession.timeline[nextStepIndex];

      if (!nextStep) {
        return {
          ...current,
          remainingSeconds: 0,
          running: false,
          completed: true,
        };
      }

      return {
        stepIndex: nextStepIndex,
        remainingSeconds: nextStep.durationSeconds,
        running: current.running,
        completed: false,
      };
    });
  }

  if (playback.completed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-10 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Funk session complete
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-8xl">
          Это было потно. Вы круты.
        </h1>
        <p className="mt-5 text-xl text-neutral-400">Грув засчитан. Соседи тоже участвовали.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            className="rounded-full bg-[var(--accent)] px-7 py-3 font-bold text-black"
            onClick={() =>
              setPlayback({ ...initialPlayback(activeSession), running: true })
            }
            type="button"
          >
            Сыграть ещё раз
          </button>
          <RouteLink href="/">Редактор</RouteLink>
        </div>
      </main>
    );
  }

  return (
    <main className="stage-shell flex min-h-screen flex-col px-4 py-5 text-white sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
            Stage Mode · {session.bpm} BPM · {session.meter}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-5xl">
            Тема {currentSection.label}
          </h1>
          <p className="mt-2 text-sm font-semibold text-neutral-400 sm:text-base">
            {formatSectionSettings(currentSection)}
          </p>
        </div>
        <div className="text-right">
          <p
            className={`font-mono text-4xl font-black tabular-nums sm:text-6xl ${warningActive ? "text-[var(--accent)]" : "text-white"}`}
            data-testid="stage-timer"
          >
            {formatTime(playback.remainingSeconds)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
            {warningActive ? "Завершайте квадрат" : "До перехода"}
          </p>
        </div>
      </header>

      <div
        className={`mt-6 grid min-h-[55vh] flex-1 gap-5 transition-all duration-700 ${warningActive && nextSection ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1"}`}
      >
          <section className="stage-frame h-full rounded-3xl border border-white/10 p-5 sm:p-8">
          <SectionGrid section={currentSection} />
        </section>

        {warningActive && nextSection ? (
          <aside
            className="rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] p-5 transition-opacity duration-700"
            data-testid="next-section-preview"
          >
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--accent)]">
              Далее
            </p>
            <h2 className="mb-5 mt-2 text-2xl font-black">
              Тема {nextSection.label}
            </h2>
            <p className="-mt-3 mb-5 text-xs font-semibold text-neutral-400">
              {formatSectionSettings(nextSection)}
            </p>
            <SectionGrid compact section={nextSection} />
          </aside>
        ) : null}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            className="rounded-full bg-[var(--accent)] px-6 py-3 font-bold text-black"
            onClick={() =>
              setPlayback((current) => ({
                ...current,
                running: !current.running,
                completed: false,
              }))
            }
            type="button"
          >
            {playback.running ? "Пауза" : "Старт"}
          </button>
          <button
            className="rounded-full border border-white/15 px-5 py-3 font-semibold"
            onClick={resetPlayback}
            type="button"
          >
            Сбросить
          </button>
          <button
            className="rounded-full border border-white/15 px-5 py-3 font-semibold"
            onClick={moveToNextStep}
            type="button"
          >
            {nextStep ? "Следующая часть" : "Завершить сессию"}
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span>
            Шаг {playback.stepIndex + 1}/{session.timeline.length} · A → B → A
          </span>
          <RouteLink href="/">Редактор</RouteLink>
        </div>
      </footer>
    </main>
  );
}

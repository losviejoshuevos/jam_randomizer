"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JamSection, JamSession, Meter } from "@/lib/music/domain/types";
import { createJamPersistence } from "@/lib/persistence/local-storage";
import { RouteLink } from "@/components/ui/route-link";
import { formatRomanChord } from "@/lib/music/rendering/format-roman-chord";
import { groupChordsForDisplay } from "@/lib/music/rendering/group-chords-for-display";
import {
  barDurationMilliseconds,
  beatsPerBar,
  chordIdAtBeat,
  formatStageDuration,
  nextBeatIndex,
} from "@/lib/music/stage/presentation";

interface PlaybackState {
  stepIndex: number;
  remainingSeconds: number;
  running: boolean;
  completed: boolean;
  started: boolean;
}

interface BeatPulse {
  beatIndex: number;
  sequence: number;
  chordId: string | null;
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

  const complexity = {
    easy: "простые аккорды",
    medium: "средние аккорды",
    advanced: "сложные аккорды",
  }[settings.complexity];
  const freedom = {
    strict: "строго в тональности",
    colorful: "с гармоническими красками",
    adventurous: "свободная гармония",
  }[settings.harmonicFreedom];

  return `${settings.key} ${settings.mode === "major" ? "мажор" : "минор"} · ${complexity} · ${freedom}`;
}

function SectionGrid({
  section,
  compact = false,
  activeChordId = null,
  beatPulse,
}: {
  section: JamSection;
  compact?: boolean;
  activeChordId?: string | null;
  beatPulse?: BeatPulse;
}) {
  const chordGroups = groupChordsForDisplay(section.chords);
  const densityClass =
    chordGroups.length === 1
      ? "stage-grid-single"
      : chordGroups.length === 2
        ? "stage-grid-pair"
        : "stage-grid-many";
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
    <div className={`grid h-full min-h-0 auto-rows-fr gap-2 sm:gap-3 ${columnClass} ${densityClass}`}>
      {chordGroups.map((group) => {
        if (group.chords.length === 2) {
          return (
            <div
              className="stage-card relative col-span-2 grid min-w-0 grid-cols-2 overflow-hidden rounded-2xl border border-[var(--accent)]/30 shadow-[0_0_28px_rgba(220,255,65,0.06)]"
              key={group.id}
            >
              <div className={`stage-bars absolute right-2 top-2 z-10 whitespace-nowrap rounded-xl border border-[var(--accent)]/50 bg-[#161a0d] font-black text-[var(--accent)] shadow-[0_0_28px_rgba(220,255,65,0.24)] ${compact ? "px-3 py-1.5 text-xl" : "px-5 py-3 text-3xl sm:right-4 sm:top-4 sm:px-6 sm:text-5xl"}`}>
                x1
              </div>
              {group.chords.map((chord, halfIndex) => (
                <div
                  className={`relative flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden text-center [container-type:size] ${halfIndex === 0 ? "rounded-l-2xl border-r border-white/15" : "rounded-r-2xl"} ${compact ? "p-2 pt-9" : "p-3 pt-12 sm:p-5 sm:pt-16"}`}
                  key={chord.id}
                >
                  {!compact &&
                  activeChordId === chord.id &&
                  beatPulse?.sequence ? (
                    <span
                      className={`stage-card-beat-pulse ${beatPulse.beatIndex === 0 ? "stage-card-beat-pulse-accent" : "stage-card-beat-pulse-regular"}`}
                      key={`${chord.id}-${beatPulse.sequence}`}
                    />
                  ) : null}
                  <div className="flex w-full items-center justify-between text-xs text-neutral-500">
                    <span>{group.startIndex + halfIndex + 1}</span>
                    <span className={`${compact ? "text-[0.6rem]" : "text-xs sm:text-base"} font-black uppercase tracking-[0.08em] text-[var(--accent)]`}>
                      {halfIndex === 0 ? "1-я половина" : "2-я половина"}
                    </span>
                  </div>
                  <p
                    className={`stage-chord-symbol mt-2 min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${compact ? "stage-chord-symbol-compact" : ""} ${chord.renderedSymbol.length > 4 ? "stage-chord-symbol-long" : ""} ${chord.renderedSymbol.length > 7 ? "stage-chord-symbol-extra-long" : ""}`}
                  >
                    {chord.renderedSymbol}
                  </p>
                  <p className={`stage-chord-roman ${compact ? "text-[0.6rem]" : "text-sm sm:text-lg"} mt-2 font-semibold tracking-[0.12em] text-neutral-400`}>
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
            className={`stage-card relative flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 p-2 text-center [container-type:size] ${compact ? "" : "p-3 sm:p-5"}`}
            key={group.id}
          >
            {!compact &&
            activeChordId === chord.id &&
            beatPulse?.sequence ? (
              <span
                className={`stage-card-beat-pulse ${beatPulse.beatIndex === 0 ? "stage-card-beat-pulse-accent" : "stage-card-beat-pulse-regular"}`}
                key={`${chord.id}-${beatPulse.sequence}`}
              />
            ) : null}
            <span className="absolute left-2 top-2 text-[0.6rem] text-neutral-500 sm:left-4 sm:top-4 sm:text-xs">
              {group.startIndex + 1}
            </span>
            <span className={`absolute right-2 top-2 z-10 rounded-xl border border-[var(--accent)]/50 bg-[#161a0d] font-black text-[var(--accent)] ${compact ? "px-3 py-1.5 text-xl" : "stage-bars px-5 py-3 text-3xl shadow-[0_0_28px_rgba(220,255,65,0.24)] sm:right-4 sm:top-4 sm:px-6 sm:text-5xl"}`}>
                {formatStageDuration(chord.durationBars)}
            </span>
            <p
              className={`stage-chord-symbol min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${compact ? "stage-chord-symbol-compact" : ""} ${chord.renderedSymbol.length > 4 ? "stage-chord-symbol-long" : ""} ${chord.renderedSymbol.length > 7 ? "stage-chord-symbol-extra-long" : ""}`}
            >
              {chord.renderedSymbol}
            </p>
            <p className={`stage-chord-roman ${compact ? "text-[0.6rem]" : "text-sm sm:text-lg"} mt-2 font-semibold tracking-[0.12em] text-neutral-400`}>
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
    started: false,
  };
}

export function StageSession() {
  const [session, setSession] = useState<JamSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [departingSectionId, setDepartingSectionId] = useState<string | null>(
    null,
  );
  const [beatPulse, setBeatPulse] = useState<BeatPulse>({
    beatIndex: 0,
    sequence: 0,
    chordId: null,
  });
  const [metronomeVolume, setMetronomeVolume] = useState(0.7);
  const [playback, setPlayback] = useState<PlaybackState>({
    stepIndex: 0,
    remainingSeconds: 0,
    running: false,
    completed: false,
    started: false,
  });
  const previousStepIndexRef = useRef(0);
  const handoffTimerRef = useRef<number | null>(null);
  const beatIndexRef = useRef(0);
  const squareBeatRef = useRef(0);
  const activeSectionRef = useRef<JamSection | null>(null);
  const activeMeterRef = useRef<Meter>("4/4");
  const accentAudioRef = useRef<HTMLAudioElement | null>(null);
  const regularAudioRef = useRef<HTMLAudioElement | null>(null);

  const triggerBeat = useCallback((beatIndex: number) => {
    const audio =
      beatIndex === 0 ? accentAudioRef.current : regularAudioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      void audio.play().catch(() => {
        // Browsers may block sound until the first explicit Start interaction.
      });
    }

    setBeatPulse((current) => ({
      beatIndex,
      sequence: current.sequence + 1,
      chordId: activeSectionRef.current
        ? chordIdAtBeat(
            activeSectionRef.current.chords,
            squareBeatRef.current,
            activeMeterRef.current,
            activeSectionRef.current.bars,
          )
        : null,
    }));
  }, []);

  useEffect(() => {
    const accent = new Audio("/service_files/accent.wav");
    const regular = new Audio("/service_files/regular.wav");
    accent.preload = "auto";
    regular.preload = "auto";
    accentAudioRef.current = accent;
    regularAudioRef.current = regular;

    return () => {
      accent.pause();
      regular.pause();
      accentAudioRef.current = null;
      regularAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (accentAudioRef.current) {
      accentAudioRef.current.volume = metronomeVolume;
    }
    if (regularAudioRef.current) {
      regularAudioRef.current.volume = metronomeVolume;
    }
  }, [metronomeVolume]);

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
      previousStepIndexRef.current = 0;
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!session || !playback.running) return;

    const intervalMilliseconds = 60_000 / session.bpm;
    let nextBeatAt = performance.now() + intervalMilliseconds;
    let timeoutId: number;

    const scheduleNextBeat = () => {
      timeoutId = window.setTimeout(() => {
        beatIndexRef.current = nextBeatIndex(
          beatIndexRef.current,
          session.meter,
        );
        const section = activeSectionRef.current;
        if (section) {
          const squareBeats = Math.max(
            1,
            section.bars * beatsPerBar(session.meter),
          );
          squareBeatRef.current =
            (squareBeatRef.current + 1) % squareBeats;
        }
        triggerBeat(beatIndexRef.current);
        nextBeatAt += intervalMilliseconds;
        scheduleNextBeat();
      }, Math.max(0, nextBeatAt - performance.now()));
    };

    scheduleNextBeat();
    return () => window.clearTimeout(timeoutId);
  }, [playback.running, session, triggerBeat]);

  useEffect(() => {
    if (!session || playback.stepIndex === previousStepIndexRef.current) return;

    const previousStep = session.timeline[previousStepIndexRef.current];
    previousStepIndexRef.current = playback.stepIndex;
    squareBeatRef.current = 0;
    setDepartingSectionId(previousStep?.sectionId ?? null);

    if (handoffTimerRef.current !== null) {
      window.clearTimeout(handoffTimerRef.current);
    }

    handoffTimerRef.current = window.setTimeout(() => {
      setDepartingSectionId(null);
      handoffTimerRef.current = null;
    }, barDurationMilliseconds(session.bpm, session.meter));

    return () => {
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
    };
  }, [playback.stepIndex, session]);

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
          started: true,
        };
      });
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [playback.running, session]);

  useEffect(() => {
    if (!session) {
      activeSectionRef.current = null;
      return;
    }

    const step = session.timeline[playback.stepIndex];
    activeSectionRef.current =
      session.sections.find(({ id }) => id === step?.sectionId) ?? null;
    activeMeterRef.current = session.meter;
  }, [playback.stepIndex, session]);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
          Сценический режим
        </p>
        <h1 className="text-4xl font-black">Нет активной сессии</h1>
        <p className="max-w-xl text-neutral-400">
          {loadError ?? "Загружаю последнюю локальную сессию…"}
        </p>
        <RouteLink href="/">Создать сессию</RouteLink>
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
  const departingSection = session.sections.find(
    ({ id }) => id === departingSectionId,
  );
  const warningActive =
    playback.running &&
    Boolean(nextStep) &&
    playback.remainingSeconds <= currentStep.transitionWarningSeconds;

  if (!currentSection) {
    return null;
  }

  function resetPlayback() {
    previousStepIndexRef.current = 0;
    beatIndexRef.current = 0;
    squareBeatRef.current = 0;
    setBeatPulse((current) => ({
      beatIndex: 0,
      sequence: current.sequence,
      chordId: null,
    }));
    setDepartingSectionId(null);
    if (handoffTimerRef.current !== null) {
      window.clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
    setPlayback(initialPlayback(activeSession));
  }

  function restartPlayback() {
    resetPlayback();
    beatIndexRef.current = 0;
    squareBeatRef.current = 0;
    triggerBeat(0);
    setPlayback({
      ...initialPlayback(activeSession),
      running: true,
      started: true,
    });
  }

  function togglePlayback() {
    if (!playback.running) {
      if (!playback.started) {
        beatIndexRef.current = 0;
        squareBeatRef.current = 0;
      } else {
        beatIndexRef.current = nextBeatIndex(
          beatIndexRef.current,
          activeSession.meter,
        );
        const squareBeats = Math.max(
          1,
          currentSection!.bars * beatsPerBar(activeSession.meter),
        );
        squareBeatRef.current =
          (squareBeatRef.current + 1) % squareBeats;
      }
      triggerBeat(beatIndexRef.current);
    }

    setPlayback((current) => ({
      ...current,
      running: !current.running,
      completed: false,
      started: true,
    }));
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
        started: current.started,
      };
    });
  }

  if (playback.completed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-10 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Джем завершён
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-8xl">
          Это было потно. Вы круты.
        </h1>
        <p className="mt-5 text-xl text-neutral-400">Грув засчитан. Соседи тоже участвовали.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button
            className="rounded-full bg-[var(--accent)] px-7 py-3 font-bold text-black"
            onClick={restartPlayback}
            type="button"
          >
            Сыграть ещё раз
          </button>
          <RouteLink href="/">Вернуться к настройкам</RouteLink>
        </div>
      </main>
    );
  }

  const layoutState = departingSection
    ? "handoff"
    : warningActive && nextSection
      ? "warning"
      : "steady";
  const totalBeats = beatsPerBar(session.meter);

  return (
    <main className="stage-shell flex h-dvh min-h-0 flex-col overflow-hidden px-3 py-3 text-white sm:px-6 sm:py-4">
      <header className="relative z-10 flex flex-none items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent)] sm:text-xs sm:tracking-[0.28em]">
            Funk · {session.bpm} BPM · {session.meter}
          </p>
          <div className="mt-1 flex items-baseline gap-3 sm:mt-2">
            <h1 className="shrink-0 text-2xl font-black sm:text-4xl">
              Тема {currentSection.label}
            </h1>
            <p className="truncate text-xs font-semibold text-neutral-400 sm:text-sm">
              {formatSectionSettings(currentSection)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-7">
          <div className="flex flex-col items-end gap-2">
            <div
              aria-label={`Метроном, доля ${beatPulse.beatIndex + 1} из ${totalBeats}`}
              className="flex items-center gap-1.5"
              data-testid="stage-metronome"
            >
              {Array.from({ length: totalBeats }, (_, index) => (
                <span
                  className={`stage-beat-dot ${playback.running && beatPulse.beatIndex === index ? index === 0 ? "stage-beat-dot-accent" : "stage-beat-dot-active" : ""}`}
                  key={index}
                />
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
              <span aria-hidden="true">🔊</span>
              <input
                aria-label="Громкость метронома"
                className="metronome-volume w-16 sm:w-24"
                max="1"
                min="0"
                onChange={(event) =>
                  setMetronomeVolume(Number(event.target.value))
                }
                step="0.05"
                type="range"
                value={metronomeVolume}
              />
              <span className="hidden w-8 text-right sm:inline">
                {Math.round(metronomeVolume * 100)}%
              </span>
            </label>
          </div>
          <div className="text-right">
            <p
              className={`font-mono text-3xl font-black tabular-nums sm:text-5xl ${warningActive ? "text-[var(--accent)]" : "text-white"}`}
              data-testid="stage-timer"
            >
              {formatTime(playback.remainingSeconds)}
            </p>
            <p className="text-[0.55rem] uppercase tracking-[0.18em] text-neutral-500 sm:mt-1 sm:text-xs">
              {warningActive ? "Завершайте квадрат" : "До перехода"}
            </p>
          </div>
        </div>
      </header>

      <div
        className={`stage-layout stage-layout-${layoutState} relative z-10 mt-3 grid min-h-0 flex-1 gap-3 transition-[grid-template-columns,grid-template-rows] duration-700 sm:mt-4`}
      >
        {departingSection ? (
          <aside
            className="stage-secondary-panel stage-departing-panel min-h-0 overflow-hidden rounded-2xl border border-white/10 p-2 opacity-55 sm:p-3"
            data-testid="previous-section-preview"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-neutral-500">
                Предыдущая
              </p>
              <p className="text-sm font-black text-neutral-400">
                Тема {departingSection.label}
              </p>
            </div>
            <div className="min-h-0 flex-1">
              <SectionGrid compact section={departingSection} />
            </div>
          </aside>
        ) : null}

        <section className="stage-frame stage-primary-panel min-h-0 overflow-hidden rounded-2xl border border-white/10 p-2 sm:rounded-3xl sm:p-4">
          <SectionGrid
            activeChordId={beatPulse.chordId}
            beatPulse={beatPulse}
            section={currentSection}
          />
        </section>

        {!departingSection && warningActive && nextSection ? (
          <aside
            className="stage-secondary-panel stage-next-panel min-h-0 overflow-hidden rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] p-2 sm:p-3"
            data-testid="next-section-preview"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                  Далее
                </p>
                <p className="text-lg font-black">Тема {nextSection.label}</p>
              </div>
              <p className="max-w-[60%] text-right text-[0.6rem] font-semibold text-neutral-400">
                {formatSectionSettings(nextSection)}
              </p>
            </div>
            <div className="min-h-0 flex-1">
              <SectionGrid compact section={nextSection} />
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="relative z-10 mt-3 flex flex-none items-center justify-between gap-3 sm:mt-4">
        <div className="flex min-w-0 gap-2 sm:gap-3">
          <button
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black sm:px-6 sm:py-3"
            onClick={togglePlayback}
            type="button"
          >
            {playback.running
              ? "Пауза"
              : playback.started
                ? "Продолжить"
                : "Старт"}
          </button>
          <button
            className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold sm:px-5 sm:py-3"
            onClick={resetPlayback}
            type="button"
          >
            Сбросить
          </button>
          <button
            className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold sm:px-5 sm:py-3"
            onClick={moveToNextStep}
            type="button"
          >
            <span className="sm:hidden">{nextStep ? "Далее" : "Финиш"}</span>
            <span className="hidden sm:inline">
              {nextStep ? "Следующая часть" : "Завершить"}
            </span>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 sm:gap-4 sm:text-sm">
          <span className="hidden sm:inline">
            Тема {currentSection.label} · далее {nextSection ? `тема ${nextSection.label}` : "финал"}
          </span>
          <RouteLink href="/">Настройки</RouteLink>
        </div>
      </footer>
    </main>
  );
}

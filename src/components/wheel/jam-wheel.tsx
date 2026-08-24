"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { STYLE_OPTIONS, styleDescriptor } from "@/data/styles";
import {
  CURRENT_SCHEMA_VERSION,
  MAX_RECENT_SESSIONS,
  type PersistedJamState,
} from "@/lib/persistence/contracts";
import { createJamPersistence } from "@/lib/persistence/local-storage";
import {
  generateWheelSession,
  WHEEL_DIFFICULTIES,
  type WheelDifficultyId,
} from "@/lib/music/wheel/generate-wheel-session";
import {
  nextWheelStyle,
  WHEEL_STYLE_CYCLE_KEY,
} from "@/lib/music/wheel/style-cycle";

const SPIN_DURATION_MS = 10_000;
const CELEBRATION_DURATION_MS = 1900;
const SEGMENT_ANGLE = 360 / STYLE_OPTIONS.length;
const FIREWORK_SPARKS = Array.from({ length: 20 }, (_, index) => index);

function randomSeed(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `wheel-${Date.now()}-${Math.random()}`;
}

function loadRemainingStyles(): string[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(WHEEL_STYLE_CYCLE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function saveWheelSession(result: ReturnType<typeof generateWheelSession>) {
  const persistence = createJamPersistence(window.localStorage);
  const loaded = persistence.load();
  const previous = loaded.ok ? loaded.value : null;
  const recentSessions = [
    result.session,
    ...(previous?.recentSessions ?? []).filter(
      ({ id }) => id !== result.session.id,
    ),
  ].slice(0, MAX_RECENT_SESSIONS);
  const state: PersistedJamState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentSession: result.session,
    recentSessions,
    favoriteSessions: previous?.favoriteSessions ?? [],
    latestSettings: result.settings,
    latestSectionSettings: result.sectionSettings,
    appliedTimingSettings: result.settings,
    selectedTheme: "dark",
  };
  return persistence.save(state);
}

export function JamWheel() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<WheelDifficultyId>(3);
  const [phase, setPhase] = useState<"idle" | "spinning" | "celebrating">("idle");
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef(0);
  const selectedDifficulty = useMemo(
    () => WHEEL_DIFFICULTIES.find(({ id }) => id === difficulty) ?? WHEEL_DIFFICULTIES[2],
    [difficulty],
  );
  const spinning = phase === "spinning";
  const busy = phase !== "idle";

  function spin() {
    if (busy) return;

    try {
      const styleIds: string[] = STYLE_OPTIONS.map(({ id }) => id);
      const cycle = nextWheelStyle(
        styleIds,
        loadRemainingStyles(),
        Math.random(),
      );
      const styleIndex = styleIds.indexOf(cycle.selected);
      const seed = randomSeed();
      const result = generateWheelSession({
        styleId: cycle.selected,
        difficulty,
        seed,
      });
      const saved = saveWheelSession(result);
      if (!saved.ok) {
        throw new Error("Браузер не разрешил сохранить сессию.");
      }

      window.localStorage.setItem(
        WHEEL_STYLE_CYCLE_KEY,
        JSON.stringify(cycle.remaining),
      );
      runRef.current += 1;
      const turns = 18 + (runRef.current % 5);
      const target = rotation + turns * 360 - styleIndex * SEGMENT_ANGLE;
      setWinner(cycle.selected);
      setError(null);
      setPhase("spinning");
      setRotation(target);

      window.setTimeout(() => setPhase("celebrating"), SPIN_DURATION_MS);
      window.setTimeout(
        () => router.push("/stage"),
        SPIN_DURATION_MS + CELEBRATION_DURATION_MS,
      );
    } catch (spinError) {
      setError(
        spinError instanceof Error
          ? spinError.message
          : "Не удалось собрать случайную сессию.",
      );
      setPhase("idle");
    }
  }

  return (
    <main className="wheel-page h-dvh overflow-hidden px-4 py-3 sm:px-7 sm:py-4">
      <header className="wheel-header mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--accent)]">
            Полный рандом
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">
            Колесо джема
          </h1>
        </div>
        <Link
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110 active:scale-95"
          href="/"
        >
          Настройки
        </Link>
      </header>

      <div className="wheel-layout mx-auto max-w-[1500px]">
        <section className="wheel-stage-area relative aspect-square">
          <div className="wheel-halo" />
          <div className="wheel-pointer" aria-hidden="true" />
          <div
            aria-label="Колесо музыкальных стилей"
            className={`jam-wheel-disc ${spinning ? "is-spinning" : ""}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {STYLE_OPTIONS.map(({ id, name }, index) => (
              <span
                className="wheel-segment-label"
                key={id}
                style={{
                  "--segment-angle": `${index * SEGMENT_ANGLE}deg`,
                  "--label-counter-angle": `${-(index * SEGMENT_ANGLE + rotation)}deg`,
                } as CSSProperties}
              >
                {name}
              </span>
            ))}
            <div aria-hidden="true" className="wheel-center" />
          </div>
          {phase === "celebrating" && winner ? (
            <div className="wheel-fireworks" aria-hidden="true">
              {["far-left", "left", "center", "right", "far-right"].map((position, burstIndex) => (
                <div className={`wheel-firework wheel-firework-${position}`} key={position}>
                  {FIREWORK_SPARKS.map((spark) => (
                    <i
                      key={spark}
                      style={{
                        "--spark-angle": `${(360 / FIREWORK_SPARKS.length) * spark + burstIndex * 8}deg`,
                        "--spark-color": ["#e3ff63", "#55e7ff", "#ff71df", "#ffcf5c"][
                          (spark + burstIndex) % 4
                        ],
                      } as CSSProperties}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : null}
          {phase === "celebrating" && winner ? (
            <div className="wheel-result" aria-live="polite">
              <span>Сегодня играем</span>
              <strong>{styleDescriptor(winner).name}</strong>
            </div>
          ) : null}
        </section>

        <section className="wheel-control w-full rounded-3xl border border-white/15 p-4 sm:p-5">
          <p className="text-xs leading-5 text-[var(--muted)] sm:text-sm">
            Колесо само выберет стиль, темп, тональность, форму и длительность.
            После остановки сразу откроется сценический режим.
          </p>

          <label className="mt-3 block text-sm font-bold sm:mt-5" htmlFor="wheel-difficulty">
            Сложность джема
          </label>
          <div className="wheel-select-wrap mt-2">
            <select
              className="w-full appearance-none rounded-xl border border-white/15 bg-black/40 py-3 pl-4 pr-12 font-bold outline-none transition focus:border-[var(--accent)] disabled:opacity-50"
              disabled={busy}
              id="wheel-difficulty"
              onChange={(event) => setDifficulty(Number(event.target.value) as WheelDifficultyId)}
              value={difficulty}
            >
              {WHEEL_DIFFICULTIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id}. {item.name}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="wheel-select-arrow">⌄</span>
          </div>
          <div className="mt-3 min-h-16 rounded-xl border border-[var(--accent-cool)]/20 bg-[var(--accent-cool)]/5 p-3">
            <p className="font-black text-[var(--accent-cool)]">{selectedDifficulty.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{selectedDifficulty.description}</p>
          </div>

          <button
            className="wheel-launch mt-3 w-full rounded-2xl px-5 py-4 text-lg font-black text-black disabled:cursor-wait sm:mt-5"
            disabled={busy}
            onClick={spin}
            type="button"
          >
            {spinning
              ? "Колесо решает…"
              : phase === "celebrating"
                ? "Собираем сцену…"
                : "Запустить колесо рандома"}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-neutral-500">
            Стиль не повторится, пока колесо не переберёт все варианты.
          </p>
          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}

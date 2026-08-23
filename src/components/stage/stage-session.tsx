"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { styleDescriptor } from "@/data/styles";
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
  nextSquareBeatIndex,
  shouldShowNextSectionPreview,
  synchronizedBeatPosition,
  synchronizedRemainingSeconds,
} from "@/lib/music/stage/presentation";
import { LiveRoomPanel } from "@/components/sharing/live-room-panel";
import {
  getRoomState,
  measureServerClock,
  publishRoomState,
  subscribeToRoom,
} from "@/lib/realtime/room-client";
import type { CreatedRoom, PublicRoomState } from "@/lib/realtime/room-types";
import {
  decodeSessionPayload,
  encodeSessionPayload,
  SESSION_QUERY_KEY,
} from "@/lib/sharing/session-payload";
import {
  clearActiveHostRoom,
  loadActiveHostRoom,
} from "@/lib/realtime/active-host-room";
import { StylePerformanceGuide } from "@/components/style/style-performance-guide";

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

interface GuestBeatSync {
  anchorAtMs: number;
  beatIndex: number;
  squareBeat: number;
}

type VisualMetronomeMode = "chord" | "indicator" | "screen";

const visualMetronomeModeLabel: Record<VisualMetronomeMode, string> = {
  chord: "аккорд",
  indicator: "индикатор",
  screen: "экран",
};

function nextVisualMetronomeMode(
  current: VisualMetronomeMode,
): VisualMetronomeMode {
  if (current === "chord") return "indicator";
  if (current === "indicator") return "screen";
  return "chord";
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
  showChordPulse = true,
}: {
  section: JamSection;
  compact?: boolean;
  activeChordId?: string | null;
  beatPulse?: BeatPulse;
  showChordPulse?: boolean;
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
              className="stage-card relative col-span-2 grid min-w-0 grid-cols-2 overflow-hidden rounded-2xl border border-[var(--accent)]/30 shadow-[0_0_28px_rgba(220,255,65,0.06)] [container-type:size]"
              key={group.id}
            >
              <div className={`absolute right-2 top-2 z-10 whitespace-nowrap rounded-xl border border-[var(--accent)]/50 bg-[var(--stage-badge-background)] font-black text-[var(--accent)] ${compact ? "px-1.5 py-0.5 text-xs" : "stage-bars px-5 py-3 text-3xl sm:right-4 sm:top-4 sm:px-6 sm:text-5xl"}`}>
                x1
              </div>
              {group.chords.map((chord, halfIndex) => (
                <div
                  className={`relative flex min-h-0 min-w-0 flex-col items-center justify-center overflow-hidden text-center [container-type:size] ${halfIndex === 0 ? "rounded-l-2xl border-r border-white/15" : "rounded-r-2xl"} ${compact ? "p-2 pt-9" : "p-3 pt-12 sm:p-5 sm:pt-16"}`}
                  key={chord.id}
                >
                  {!compact &&
                  showChordPulse &&
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
                    className={`stage-chord-symbol mt-2 min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${compact ? "stage-chord-symbol-compact" : ""} ${chord.renderedSymbol.length > 4 ? "stage-chord-symbol-long" : ""} ${chord.renderedSymbol.length > 6 ? "stage-chord-symbol-extra-long" : ""}`}
                  >
                    {chord.renderedSymbol}
                  </p>
                  <p className={`stage-chord-roman ${compact ? "text-[0.6rem]" : "text-sm sm:text-lg"} mt-2 font-semibold tracking-[0.12em] text-neutral-400`}>
                    {formatRomanChord(
                      chord.roman,
                      section.harmonySettings.mode,
                    )}
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
            showChordPulse &&
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
            <span className={`absolute right-2 top-2 z-10 rounded-xl border border-[var(--accent)]/50 bg-[var(--stage-badge-background)] font-black text-[var(--accent)] ${compact ? "px-1.5 py-0.5 text-xs" : "stage-bars px-5 py-3 text-3xl sm:right-4 sm:top-4 sm:px-6 sm:text-5xl"}`}>
                {formatStageDuration(chord.durationBars)}
            </span>
            <p
              className={`stage-chord-symbol min-w-0 whitespace-nowrap font-black leading-none tracking-[-0.05em] ${compact ? "stage-chord-symbol-compact" : ""} ${chord.renderedSymbol.length > 4 ? "stage-chord-symbol-long" : ""} ${chord.renderedSymbol.length > 6 ? "stage-chord-symbol-extra-long" : ""}`}
            >
              {chord.renderedSymbol}
            </p>
            <p className={`stage-chord-roman ${compact ? "text-[0.6rem]" : "text-sm sm:text-lg"} mt-2 font-semibold tracking-[0.12em] text-neutral-400`}>
              {formatRomanChord(
                chord.roman,
                section.harmonySettings.mode,
              )}
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

function nextPlaybackState(
  current: PlaybackState,
  session: JamSession,
): PlaybackState {
  const nextStep = session.timeline[current.stepIndex + 1];
  if (!nextStep) {
    return {
      ...current,
      remainingSeconds: 0,
      running: false,
      completed: true,
    };
  }

  return {
    stepIndex: current.stepIndex + 1,
    remainingSeconds: nextStep.durationSeconds,
    running: current.running,
    completed: false,
    started: current.started,
  };
}

export function StageSession() {
  const router = useRouter();
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
  const [visualMetronomeMode, setVisualMetronomeMode] =
    useState<VisualMetronomeMode>("chord");
  const [transitionQueued, setTransitionQueued] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomConnected, setRoomConnected] = useState(false);
  const [hostRoom, setHostRoom] = useState<CreatedRoom | null>(null);
  const [sharedPayload, setSharedPayload] = useState<string | null>(null);
  const [guestBeatSync, setGuestBeatSync] = useState<GuestBeatSync | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [clockRoundTripMs, setClockRoundTripMs] = useState<number | null>(null);
  const [lastRoomState, setLastRoomState] = useState<PublicRoomState | null>(null);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  const [startScheduling, setStartScheduling] = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [roomTerminated, setRoomTerminated] = useState(false);
  const [exitChoiceOpen, setExitChoiceOpen] = useState(false);
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
  const transitionQueuedRef = useRef(false);
  const playbackRef = useRef(playback);
  const lastPublishedSnapshotRef = useRef<string | null>(null);
  const serverClockOffsetRef = useRef(0);
  const serverClockSynchronizedRef = useRef(false);
  const scheduledStartTimerRef = useRef<number | null>(null);
  const pendingBeatAnchorAtMsRef = useRef<number | null>(null);
  const lastObservedRoomBeatAnchorRef = useRef<string | null>(null);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  useEffect(() => {
    if (!debugEnabled || !lastRoomState) return;
    console.info("[Jam Randomizer · room state]", {
      receivedAt: new Date().toISOString(),
      roomConnected,
      clockRoundTripMs,
      serverClockOffsetMs: Math.round(serverClockOffsetRef.current),
      state: lastRoomState,
    });
  }, [clockRoundTripMs, debugEnabled, lastRoomState, roomConnected]);

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
    if (!session || guestMode || hostRoom) return;
    const active = loadActiveHostRoom();
    if (!active) return;
    let cancelled = false;
    void getRoomState(active.roomId).then(async (room) => {
      if (cancelled || room.phase === "terminated") {
        if (room.phase === "terminated") clearActiveHostRoom();
        return;
      }
      let attachedRoom = room;
      if (room.sessionId !== session.id || room.phase === "waiting") {
        attachedRoom = await publishRoomState(active.roomId, active.hostToken, {
          sessionId: session.id,
          sessionPayload: encodeSessionPayload(session),
          phase: "idle",
          stepIndex: 0,
          remainingSeconds: session.timeline[0]?.durationSeconds ?? 0,
          beatIndex: 0,
          squareBeat: 0,
        });
        setPlayback(initialPlayback(session));
      } else if (room.phase === "playing" || room.phase === "paused") {
        const anchorAt = Date.parse(room.beatAnchorAt ?? room.updatedAt);
        const remainingSeconds = synchronizedRemainingSeconds({
          remainingAtAnchor: room.remainingSeconds,
          anchorAtMs: anchorAt,
          serverNowMs: Date.now(),
        });
        beatIndexRef.current = room.beatIndex;
        squareBeatRef.current = room.squareBeat;
        setPlayback({
          stepIndex: room.stepIndex,
          remainingSeconds,
          running: false,
          completed: false,
          started: true,
        });
        attachedRoom = await publishRoomState(active.roomId, active.hostToken, {
          phase: "paused",
          stepIndex: room.stepIndex,
          remainingSeconds,
          beatIndex: room.beatIndex,
          squareBeat: room.squareBeat,
        });
      }
      if (!cancelled) {
        setHostRoom({
          room: attachedRoom,
          hostToken: active.hostToken,
          storage: active.storage,
        });
      }
    }).catch(() => {
      clearActiveHostRoom();
    });
    return () => {
      cancelled = true;
    };
  }, [guestMode, hostRoom, session]);

  useEffect(() => {
    if (!hostRoom || guestMode) return;
    const heartbeat = () => {
      void publishRoomState(hostRoom.room.roomId, hostRoom.hostToken, {
        heartbeat: true,
      }).catch(() => setLoadError("Связь комнаты с сервером потеряна."));
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 10_000);
    return () => window.clearInterval(timer);
  }, [guestMode, hostRoom]);

  useEffect(() => {
    if (guestMode) return;
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
  }, [guestMode]);

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
      const query = new URLSearchParams(window.location.search);
      const payload = query.get(SESSION_QUERY_KEY);
      const requestedRoomId = query.get("room");
      const requestedGuestMode = query.get("role") === "guest";
      setDebugEnabled(query.get("debug") === "1");
      if (payload) {
        try {
          const sharedSession = decodeSessionPayload(payload);
          setSharedPayload(payload);
          setSession(sharedSession);
          setPlayback(initialPlayback(sharedSession));
          setGuestMode(requestedGuestMode);
          setRoomId(requestedRoomId);
          previousStepIndexRef.current = 0;
          return;
        } catch (error) {
          setLoadError(error instanceof Error ? error.message : "Не удалось открыть ссылку.");
          return;
        }
      }
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
    const hasLiveRoom = guestMode ? Boolean(roomId) : Boolean(hostRoom);
    if (!hasLiveRoom) return;
    let cancelled = false;
    const synchronize = () => {
      void measureServerClock().then((clock) => {
        if (cancelled) return;
        serverClockOffsetRef.current = clock.offsetMs;
        serverClockSynchronizedRef.current = true;
        setClockRoundTripMs(clock.roundTripMs);
      }).catch(() => {
        // The room can still work with the device clock if the probe fails.
      });
    };
    synchronize();
    const timer = window.setInterval(synchronize, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [guestMode, hostRoom, roomId]);

  useEffect(() => {
    if (!guestMode || roomConnected || roomTerminated) return;
    const timer = window.setTimeout(() => {
      setHostDisconnected(true);
      setPlayback((current) => ({ ...current, running: false }));
    }, 15_000);
    return () => window.clearTimeout(timer);
  }, [guestMode, roomConnected, roomTerminated]);

  useEffect(() => {
    if (!guestMode || !roomId || !session) return;
    const applyRoomState = (state: PublicRoomState) => {
      let roomSession = session;
      const sessionChanged = state.sessionId !== session.id;
      if (sessionChanged) {
        try {
          roomSession = decodeSessionPayload(state.sessionPayload);
          setSession(roomSession);
          setSharedPayload(state.sessionPayload);
          previousStepIndexRef.current = 0;
        } catch {
          setLoadError("Ведущий передал повреждённую сессию.");
          return;
        }
      }
      const timerAnchorAt = state.beatAnchorAt ?? state.updatedAt;
      const elapsed =
        state.phase === "playing"
          ? Math.max(
              0,
              (Date.now() + serverClockOffsetRef.current -
                Date.parse(timerAnchorAt)) /
                1000,
            )
          : 0;
      const next: PlaybackState = {
        stepIndex: Math.min(state.stepIndex, roomSession.timeline.length - 1),
        remainingSeconds: Math.max(0, state.remainingSeconds - elapsed),
        running: state.phase === "playing",
        completed: state.phase === "complete",
        started: state.phase !== "idle",
      };
      const previousPlayback = playbackRef.current;
      const stepChanged = next.stepIndex !== previousPlayback.stepIndex;
      if (stepChanged) {
        const previousStep = session.timeline[previousPlayback.stepIndex];
        previousStepIndexRef.current = next.stepIndex;
        setDepartingSectionId(previousStep?.sectionId ?? null);
        if (handoffTimerRef.current !== null) {
          window.clearTimeout(handoffTimerRef.current);
        }
        handoffTimerRef.current = window.setTimeout(() => {
          setDepartingSectionId(null);
          handoffTimerRef.current = null;
        }, barDurationMilliseconds(session.bpm, session.meter));
      }
      playbackRef.current = next;
      const nextStep = roomSession.timeline[next.stepIndex];
      activeSectionRef.current =
        roomSession.sections.find(({ id }) => id === nextStep?.sectionId) ?? null;
      setLastRoomState(state);
      if (state.beatAnchorAt) {
        const anchorChanged =
          lastObservedRoomBeatAnchorRef.current !== state.beatAnchorAt;
        lastObservedRoomBeatAnchorRef.current = state.beatAnchorAt;

        // A section handoff stays on the same uninterrupted beat grid. Keep
        // that grid running instead of replaying its first beat when the SSE
        // transition snapshot reaches the guest.
        const keepContinuousGrid =
          anchorChanged &&
          stepChanged &&
          !sessionChanged &&
          previousPlayback.running &&
          state.phase === "playing";
        if (anchorChanged && !keepContinuousGrid) {
          const nextSync = {
            anchorAtMs: Date.parse(state.beatAnchorAt),
            beatIndex: state.beatIndex,
            squareBeat: state.squareBeat,
          };
          setGuestBeatSync((current) =>
            current &&
            current.anchorAtMs === nextSync.anchorAtMs &&
            current.beatIndex === nextSync.beatIndex &&
            current.squareBeat === nextSync.squareBeat
              ? current
              : nextSync,
          );
        }
      }
      setPlayback(next);
      setHostDisconnected(false);
    };
    return subscribeToRoom(
      roomId,
      applyRoomState,
      () => setLoadError("Временная комната завершена или истекла."),
      setRoomConnected,
      (connected) => {
        setHostDisconnected(!connected);
        if (!connected) {
          setPlayback((current) => ({ ...current, running: false }));
        }
      },
      () => {
        setRoomTerminated(true);
        setRoomConnected(false);
        setPlayback((current) => ({ ...current, running: false }));
      },
    );
  }, [guestMode, roomId, session]);

  useEffect(() => {
    if (!guestMode || !playback.running || !session || !guestBeatSync) return;
    const beatMilliseconds = 60_000 / session.bpm;
    let timeoutId: number;

    const synchronizePulse = () => {
      const serverNow = Date.now() + serverClockOffsetRef.current;
      if (serverNow < guestBeatSync.anchorAtMs) {
        timeoutId = window.setTimeout(
          synchronizePulse,
          Math.max(16, guestBeatSync.anchorAtMs - serverNow),
        );
        return;
      }
      const section = activeSectionRef.current;
      const squareBeats = Math.max(
        1,
        (section?.bars ?? 1) * beatsPerBar(session.meter),
      );
      const position = synchronizedBeatPosition({
        serverNowMs: serverNow,
        anchorAtMs: guestBeatSync.anchorAtMs,
        beatMilliseconds,
        anchorBeatIndex: guestBeatSync.beatIndex,
        anchorSquareBeat: guestBeatSync.squareBeat,
        meter: session.meter,
        squareBeats,
      });
      const { beatIndex, squareBeat } = position;
      beatIndexRef.current = beatIndex;
      squareBeatRef.current = squareBeat;
      triggerBeat(beatIndex);

      timeoutId = window.setTimeout(
        synchronizePulse,
        position.millisecondsUntilNextBeat,
      );
    };

    synchronizePulse();
    return () => window.clearTimeout(timeoutId);
  }, [guestBeatSync, guestMode, playback.running, session, triggerBeat]);

  useEffect(() => {
    if (
      !guestMode ||
      !playback.running ||
      !lastRoomState ||
      lastRoomState.phase !== "playing"
    ) {
      return;
    }
    const anchorAtMs = Date.parse(
      lastRoomState.beatAnchorAt ?? lastRoomState.updatedAt,
    );
    let timeoutId: number;

    const synchronizeTimer = () => {
      const serverNow = Date.now() + serverClockOffsetRef.current;
      const elapsedMilliseconds = Math.max(0, serverNow - anchorAtMs);
      const remainingSeconds = synchronizedRemainingSeconds({
        remainingAtAnchor: lastRoomState.remainingSeconds,
        anchorAtMs,
        serverNowMs: serverNow,
      });
      setPlayback((current) => {
        if (current.stepIndex !== lastRoomState.stepIndex) return current;
        const next = { ...current, remainingSeconds };
        playbackRef.current = next;
        return next;
      });

      const untilAnchor = anchorAtMs - serverNow;
      const untilNextSecond =
        untilAnchor > 0
          ? untilAnchor
          : 1_000 - (elapsedMilliseconds % 1_000);
      timeoutId = window.setTimeout(
        synchronizeTimer,
        Math.max(16, untilNextSecond + 4),
      );
    };

    synchronizeTimer();
    return () => window.clearTimeout(timeoutId);
  }, [guestMode, lastRoomState, playback.running]);

  useEffect(() => {
    if (!session || !playback.running || guestMode) return;

    const intervalMilliseconds = 60_000 / session.bpm;
    let nextBeatAt = performance.now() + intervalMilliseconds;
    let timeoutId: number;

    const scheduleNextBeat = () => {
      timeoutId = window.setTimeout(() => {
        const nextBeat = nextBeatIndex(
          beatIndexRef.current,
          session.meter,
        );
        beatIndexRef.current = nextBeat;

        const section = activeSectionRef.current;
        const nextSquareBeat = section
          ? nextSquareBeatIndex(
              squareBeatRef.current,
              session.meter,
              section.bars,
            )
          : 0;
        squareBeatRef.current = nextSquareBeat;

        if (nextSquareBeat === 0 && transitionQueuedRef.current) {
          transitionQueuedRef.current = false;
          setTransitionQueued(false);
          const nextPlayback = nextPlaybackState(playbackRef.current, session);
          playbackRef.current = nextPlayback;
          setPlayback(nextPlayback);
          squareBeatRef.current = 0;

          if (nextPlayback.completed) return;

          const nextStep = session.timeline[nextPlayback.stepIndex];
          activeSectionRef.current =
            session.sections.find(({ id }) => id === nextStep?.sectionId) ??
            null;
          pendingBeatAnchorAtMsRef.current =
            serverClockSynchronizedRef.current
              ? Date.now() + serverClockOffsetRef.current
              : null;
          triggerBeat(0);
          nextBeatAt += intervalMilliseconds;
          scheduleNextBeat();
          return;
        }

        triggerBeat(nextBeat);
        nextBeatAt += intervalMilliseconds;
        scheduleNextBeat();
      }, Math.max(0, nextBeatAt - performance.now()));
    };

    scheduleNextBeat();
    return () => window.clearTimeout(timeoutId);
  }, [guestMode, playback.running, session, triggerBeat]);

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
    if (!session || !playback.running || guestMode) {
      return;
    }

    const timer = window.setInterval(() => {
      const current = playbackRef.current;
      if (!current.running) return;

      if (transitionQueuedRef.current && current.remainingSeconds <= 1) {
        const frozen = { ...current, remainingSeconds: 0 };
        playbackRef.current = frozen;
        setPlayback(frozen);
        return;
      }

      if (current.remainingSeconds > 1) {
        const ticking = {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
        playbackRef.current = ticking;
        setPlayback(ticking);
        return;
      }

      // The clock only requests a transition. The metronome scheduler performs
      // it when the current harmonic square wraps to its first beat.
      transitionQueuedRef.current = true;
      setTransitionQueued(true);
      const queued = { ...current, remainingSeconds: 0 };
      playbackRef.current = queued;
      setPlayback(queued);
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [guestMode, playback.running, session]);

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

  const hostPhase = playback.completed
    ? "complete"
    : playback.running
      ? "playing"
      : playback.started
        ? "paused"
        : "idle";
  const hostSnapshotKey = `${hostPhase}:${playback.stepIndex}`;

  useEffect(() => {
    if (!hostRoom || guestMode) return;
    if (lastPublishedSnapshotRef.current === hostSnapshotKey) return;
    lastPublishedSnapshotRef.current = hostSnapshotKey;
    const beatAnchorAtMs = pendingBeatAnchorAtMsRef.current;
    pendingBeatAnchorAtMsRef.current = null;
    void publishRoomState(hostRoom.room.roomId, hostRoom.hostToken, {
      phase: hostPhase,
      stepIndex: playbackRef.current.stepIndex,
      remainingSeconds: playbackRef.current.remainingSeconds,
      beatIndex: beatIndexRef.current,
      squareBeat: squareBeatRef.current,
      ...(beatAnchorAtMs === null ? {} : { beatAnchorAtMs }),
    }).catch(() => setLoadError("Не удалось синхронизировать ведомые экраны."));
  }, [guestMode, hostPhase, hostRoom, hostSnapshotKey]);

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
  const warningActive = shouldShowNextSectionPreview({
    running: playback.running,
    hasNextSection: Boolean(nextStep && nextSection),
    transitionQueued,
    remainingSeconds: playback.remainingSeconds,
    warningSeconds: currentStep.transitionWarningSeconds,
  });
  const editorHref = sharedPayload
    ? `/?${SESSION_QUERY_KEY}=${encodeURIComponent(sharedPayload)}`
    : "/";

  function openEditor() {
    if (
      guestMode &&
      !window.confirm(
        "Вы покинете ведомый экран и перестанете получать изменения от ведущего. Открыть настройки?",
      )
    ) {
      return;
    }
    router.push(editorHref);
  }

  async function copyDiagnostics() {
    const diagnostics = {
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      roomId,
      roomConnected,
      clockRoundTripMs,
      serverClockOffsetMs: Math.round(serverClockOffsetRef.current),
      playback,
      beatPulse,
      roomState: lastRoomState,
    };
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setDiagnosticsCopied(true);
    window.setTimeout(() => setDiagnosticsCopied(false), 2_000);
  }

  async function configureNextSession(reuseMusicians: boolean) {
    if (!hostRoom) {
      router.push("/");
      return;
    }
    try {
      await publishRoomState(hostRoom.room.roomId, hostRoom.hostToken, {
        phase: reuseMusicians ? "waiting" : "terminated",
        heartbeat: true,
      });
      if (!reuseMusicians) clearActiveHostRoom();
      router.push("/");
    } catch {
      setLoadError("Не удалось изменить состояние комнаты.");
      setExitChoiceOpen(false);
    }
  }

  if (!currentSection) {
    return null;
  }

  if (guestMode && roomTerminated) {
    return (
      <main className="stage-shell flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" data-style={session.styleId}>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Комната закрыта</p>
        <h1 className="mt-5 text-4xl font-black sm:text-6xl">Ведущий завершил сессию</h1>
        <p className="mt-4 max-w-xl text-neutral-400">Для следующего джема понадобится новое приглашение.</p>
      </main>
    );
  }

  if (guestMode && hostDisconnected) {
    return (
      <main className="stage-shell flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" data-style={session.styleId}>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">Нет связи с ведущим</p>
        <h1 className="mt-5 text-4xl font-black sm:text-6xl">Сессия поставлена на паузу</h1>
        <p className="mt-4 max-w-xl text-neutral-400">Ждём возвращения ведущего до пяти минут. Переподключаться не нужно.</p>
      </main>
    );
  }

  if (guestMode && lastRoomState?.phase === "waiting") {
    return (
      <main className="stage-shell flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" data-style={session.styleId}>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent-cool)]">Музыканты остаются в комнате</p>
        <h1 className="mt-5 text-4xl font-black sm:text-6xl">Ведущий готовит следующий джем</h1>
        <p className="mt-4 max-w-xl text-neutral-400">Новые настройки и аккорды появятся здесь автоматически.</p>
      </main>
    );
  }

  function resetPlayback() {
    if (scheduledStartTimerRef.current !== null) {
      window.clearTimeout(scheduledStartTimerRef.current);
      scheduledStartTimerRef.current = null;
    }
    setStartScheduling(false);
    previousStepIndexRef.current = 0;
    beatIndexRef.current = 0;
    squareBeatRef.current = 0;
    setBeatPulse((current) => ({
      beatIndex: 0,
      sequence: current.sequence,
      chordId: null,
    }));
    setDepartingSectionId(null);
    transitionQueuedRef.current = false;
    setTransitionQueued(false);
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

  async function togglePlayback() {
    if (startScheduling) return;
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
      if (hostRoom) {
        setStartScheduling(true);
        const requestStartedAt = performance.now();
        try {
          const synchronized = await publishRoomState(
            hostRoom.room.roomId,
            hostRoom.hostToken,
            {
              phase: "playing",
              stepIndex: playbackRef.current.stepIndex,
              remainingSeconds: playbackRef.current.remainingSeconds,
              beatIndex: beatIndexRef.current,
              squareBeat: squareBeatRef.current,
              startLeadMs: 1_500,
            },
          );
          const roundTripMs = performance.now() - requestStartedAt;
          const serverLeadMs = synchronized.beatAnchorAt
            ? Date.parse(synchronized.beatAnchorAt) -
              Date.parse(synchronized.updatedAt)
            : 0;
          const localDelayMs = Math.max(0, serverLeadMs - roundTripMs / 2);
          lastPublishedSnapshotRef.current =
            `playing:${playbackRef.current.stepIndex}`;
          scheduledStartTimerRef.current = window.setTimeout(() => {
            scheduledStartTimerRef.current = null;
            triggerBeat(beatIndexRef.current);
            setPlayback((current) => ({
              ...current,
              running: true,
              completed: false,
              started: true,
            }));
            setStartScheduling(false);
          }, localDelayMs);
          return;
        } catch {
          setLoadError("Не удалось согласовать старт с ведомыми экранами.");
          setStartScheduling(false);
        }
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
    if (playback.running) {
      transitionQueuedRef.current = true;
      setTransitionQueued(true);
      return;
    }

    setPlayback((current) => nextPlaybackState(current, activeSession));
  }

  if (playback.completed) {
    return (
      <main className="stage-shell flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center text-white" data-style={session.styleId}>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent)]">
          Джем завершён
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-8xl">
          Это было потно. Вы круты.
        </h1>
        <p className="mt-5 text-xl text-neutral-400">Грув засчитан. Соседи тоже участвовали.</p>
        {guestMode ? (
          <p className="mt-3 text-sm text-[var(--accent-cool)]">Ведущий завершил сессию.</p>
        ) : null}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {!guestMode ? <button
            className="rounded-full bg-[var(--accent)] px-7 py-3 font-bold text-black"
            onClick={restartPlayback}
            type="button"
          >
            Сыграть ещё раз
          </button> : null}
          {guestMode ? (
            <button
              className="rounded-full border border-white/15 px-7 py-3 font-bold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={openEditor}
              type="button"
            >
              Вернуться к настройкам
            </button>
          ) : (
            <button
              className="rounded-full bg-[var(--accent)] px-7 py-3 font-bold text-black transition hover:brightness-110 active:scale-95"
              onClick={() => hostRoom ? setExitChoiceOpen(true) : router.push(editorHref)}
              type="button"
            >
              Вернуться к настройкам
            </button>
          )}
        </div>
        {exitChoiceOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-[#171714] p-6 text-left shadow-2xl sm:p-8">
              <h2 className="text-3xl font-black">Кто играет следующий джем?</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-400">Те же музыканты останутся на ведомых экранах и автоматически получат следующую сессию.</p>
              <div className="mt-7 grid gap-3">
                <button className="rounded-2xl bg-[var(--accent)] px-5 py-4 text-left font-black text-black transition hover:brightness-110 active:scale-[0.99]" onClick={() => void configureNextSession(true)} type="button">Продолжить с теми же музыкантами</button>
                <button className="rounded-2xl border border-white/15 px-5 py-4 text-left font-bold transition hover:border-white/40 active:scale-[0.99]" onClick={() => void configureNextSession(false)} type="button">Создать комнату для новых музыкантов</button>
                <button className="rounded-full px-5 py-3 text-sm font-bold text-neutral-400 transition hover:text-white" onClick={() => setExitChoiceOpen(false)} type="button">Отмена</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  const layoutState = departingSection
    ? "handoff"
    : warningActive && nextSection
      ? "warning"
      : "steady";
  const totalBeats = beatsPerBar(session.meter);
  const stageStatus = startScheduling
    ? "Синхронизация"
    : transitionQueued
      ? "Переход после квадрата"
      : warningActive
        ? "Скоро следующая тема"
        : playback.running
          ? `Играем тему ${currentSection.label}`
          : playback.started
            ? "Пауза"
            : "Готово к старту";

  return (
    <main className="stage-shell flex h-dvh min-h-0 flex-col overflow-hidden px-3 py-3 text-white sm:px-6 sm:py-4" data-style={session.styleId}>
      {visualMetronomeMode === "screen" &&
      playback.running &&
      beatPulse.sequence ? (
        <span
          aria-hidden="true"
          className={`stage-screen-beat-pulse ${beatPulse.beatIndex === 0 ? "stage-screen-beat-pulse-accent" : "stage-screen-beat-pulse-regular"}`}
          data-testid="stage-screen-beat-pulse"
          key={beatPulse.sequence}
        />
      ) : null}
      <header className="relative z-10 flex flex-none items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--accent)] sm:text-xs sm:tracking-[0.28em]">
            {styleDescriptor(session.styleId).name} · {session.bpm} BPM · {session.meter}
            {guestMode ? ` · Ведомый экран · ${roomConnected ? "онлайн" : "подключение…"}` : ""}
            <span className="text-[var(--accent-cool)]" data-testid="stage-status">
              {` · ${stageStatus}`}
            </span>
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
            {visualMetronomeMode === "indicator" ? (
              <div
                aria-label={`Единый световой метроном, доля ${beatPulse.beatIndex + 1} из ${totalBeats}`}
                className="stage-metronome-indicator-shell"
                data-testid="stage-metronome-indicator"
              >
                <span
                  className={`stage-metronome-indicator ${playback.running && beatPulse.sequence ? beatPulse.beatIndex === 0 ? "stage-metronome-indicator-accent" : "stage-metronome-indicator-regular" : ""}`}
                  key={playback.running ? beatPulse.sequence : "idle"}
                />
                <span className="font-mono text-xs font-black tabular-nums text-neutral-300 sm:text-sm">
                  {beatPulse.beatIndex + 1}/{totalBeats}
                </span>
              </div>
            ) : (
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
            )}
            {!guestMode ? <label className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
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
            </label> : null}
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
            showChordPulse={visualMetronomeMode === "chord"}
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

      <footer className="stage-footer relative z-10 mt-3 flex flex-none flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {!guestMode ? <div className="stage-footer-controls grid min-w-0 grid-cols-3 gap-2 sm:flex sm:gap-3">
          <button
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black transition active:scale-95 disabled:cursor-wait disabled:opacity-65 sm:px-6 sm:py-3"
            disabled={startScheduling}
            onClick={() => void togglePlayback()}
            type="button"
          >
            {startScheduling
              ? "Синхронизация…"
              : playback.running
              ? "Пауза"
              : playback.started
                ? "Продолжить"
                : "Старт"}
          </button>
          <button
            className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-50 sm:px-5 sm:py-3"
            disabled={startScheduling}
            onClick={resetPlayback}
            type="button"
          >
            Сбросить
          </button>
          <button
            aria-label={
              `Световой метроном: ${visualMetronomeModeLabel[visualMetronomeMode]}. ` +
              `Переключить на ${visualMetronomeModeLabel[nextVisualMetronomeMode(visualMetronomeMode)]}`
            }
            className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent-cool)] hover:text-[var(--accent-cool)] sm:px-5 sm:py-3"
            data-testid="visual-metronome-mode-toggle"
            onClick={() =>
              setVisualMetronomeMode(nextVisualMetronomeMode)
            }
            type="button"
          >
            Метроном: {visualMetronomeModeLabel[visualMetronomeMode]}
          </button>
          <button
            className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold disabled:cursor-wait disabled:border-[var(--accent)]/40 disabled:text-[var(--accent)] sm:px-5 sm:py-3"
            disabled={transitionQueued || startScheduling}
            onClick={moveToNextStep}
            type="button"
          >
            <span className="sm:hidden">
              {transitionQueued ? "После квадрата" : nextStep ? "Далее" : "Финиш"}
            </span>
            <span className="hidden sm:inline">
              {transitionQueued
                ? "Переход после квадрата"
                : nextStep
                  ? "Следующая часть"
                  : "Завершить"}
            </span>
          </button>
          <LiveRoomPanel onCreated={setHostRoom} session={session} />
        </div> : (
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-full border border-[var(--accent-cool)]/35 px-4 py-2 text-sm font-semibold text-[var(--accent-cool)]">
              Управление у ведущего
            </div>
            <button
              aria-label={
                `Световой метроном: ${visualMetronomeModeLabel[visualMetronomeMode]}. ` +
                `Переключить на ${visualMetronomeModeLabel[nextVisualMetronomeMode(visualMetronomeMode)]}`
              }
              className="rounded-full border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-[var(--accent-cool)] hover:text-[var(--accent-cool)] active:scale-95"
              data-testid="guest-visual-metronome-mode-toggle"
              onClick={() => setVisualMetronomeMode(nextVisualMetronomeMode)}
              type="button"
            >
              Метроном: {visualMetronomeModeLabel[visualMetronomeMode]}
            </button>
          </div>
        )}
        <div className="flex shrink-0 items-center justify-end gap-2 text-xs text-neutral-500 sm:gap-4 sm:text-sm">
          <StylePerformanceGuide
            className="rounded-full border border-white/15 px-3 py-2 font-bold text-white transition hover:border-[var(--accent-cool)] hover:text-[var(--accent-cool)] active:scale-95 sm:px-4"
            compact
            styleId={session.styleId}
          />
          {guestMode ? (
            <button
              className="rounded-full bg-[var(--accent)] px-4 py-2 font-bold text-black transition hover:brightness-110 active:scale-95"
              onClick={openEditor}
              type="button"
            >
              Настройки
            </button>
          ) : (
            <RouteLink href={editorHref}>Настройки</RouteLink>
          )}
        </div>
      </footer>
      {guestMode && debugEnabled ? (
        <aside className="fixed bottom-20 right-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--accent-cool)]/35 bg-black/90 p-3 text-xs shadow-2xl backdrop-blur sm:bottom-24 sm:right-6">
          <p className="font-bold text-[var(--accent-cool)]">Диагностика ведомого экрана</p>
          <p className="mt-1 text-neutral-400">
            SSE: {roomConnected ? "онлайн" : "нет связи"} · RTT: {clockRoundTripMs === null ? "—" : `${clockRoundTripMs} мс`} · rev: {lastRoomState?.revision ?? "—"}
          </p>
          <button
            className="mt-2 rounded-full border border-white/20 px-3 py-1.5 font-bold transition hover:border-white active:scale-95"
            onClick={() => void copyDiagnostics()}
            type="button"
          >
            {diagnosticsCopied ? "Скопировано" : "Скопировать диагностику"}
          </button>
        </aside>
      ) : null}
    </main>
  );
}

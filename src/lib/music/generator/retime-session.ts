import type { StyleProfile } from "../domain/style-profile";
import type { GenerationSettings, JamSession } from "../domain/types";
import { resolveBpm } from "../tempo/resolve-bpm";
import { calculateTransitionWarningSeconds } from "../tempo/transition-timing";
import { resolveSectionDurationSeconds } from "../tempo/section-duration";

export function retimeSession(
  session: JamSession,
  settings: GenerationSettings,
  styleProfile: StyleProfile,
): JamSession {
  const bpm = resolveBpm(settings.bpm, styleProfile.bpmRange, session.seed);
  const sections = session.sections.map((section) => {
    let startBar = 0;
    const chords = section.chords.map((chord) => {
      const durationBars =
        settings.meter === "3/4" && chord.durationBars === 0.5
          ? 1
          : chord.durationBars;
      const normalized = { ...chord, startBar, durationBars };
      startBar += durationBars;
      return normalized;
    });

    return { ...section, bars: startBar, chords };
  });
  const warnings = new Map(
    sections.map((section) => [
      section.id,
      calculateTransitionWarningSeconds(section.bars, bpm, settings.meter),
    ]),
  );
  const durations = new Map(
    sections.map((section) => [
      section.id,
      resolveSectionDurationSeconds({
        timing: settings.timing,
        label: section.label,
        bars: section.bars,
        bpm,
        meter: settings.meter,
        seed: session.seed,
      }),
    ]),
  );

  return {
    ...session,
    bpm,
    meter: settings.meter,
    sections,
    timeline: session.timeline.map((step) => ({
      ...step,
      durationSeconds: durations.get(step.sectionId) ?? step.durationSeconds,
      transitionWarningSeconds: warnings.get(step.sectionId) ?? 0,
    })),
    transitionWarningSeconds: Math.max(...warnings.values()),
  };
}

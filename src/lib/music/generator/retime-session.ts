import type { StyleProfile } from "../domain/style-profile";
import type { GenerationSettings, JamSession } from "../domain/types";
import { resolveBpm } from "../tempo/resolve-bpm";
import { calculateTransitionWarningSeconds } from "../tempo/transition-timing";

export function retimeSession(
  session: JamSession,
  settings: GenerationSettings,
  styleProfile: StyleProfile,
): JamSession {
  const bpm = resolveBpm(settings.bpm, styleProfile.bpmRange, session.seed);
  const warnings = new Map(
    session.sections.map((section) => [
      section.id,
      calculateTransitionWarningSeconds(section.bars, bpm, session.meter),
    ]),
  );

  return {
    ...session,
    bpm,
    timeline: session.timeline.map((step, index) => ({
      ...step,
      durationSeconds:
        index === 1
          ? settings.timing.sectionBDurationSeconds
          : settings.timing.sectionADurationSeconds,
      transitionWarningSeconds: warnings.get(step.sectionId) ?? 0,
    })),
    transitionWarningSeconds: Math.max(...warnings.values()),
  };
}

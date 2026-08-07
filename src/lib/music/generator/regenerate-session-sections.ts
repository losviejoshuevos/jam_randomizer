import type {
  GenerationSettings,
  JamSection,
  JamSession,
  SectionHarmonySettings,
  SectionLabel,
} from "../domain/types";
import { deriveSeed } from "../random";
import { calculateTransitionWarningSeconds } from "../tempo/transition-timing";
import type {
  GenerationResult,
  RegenerateSessionSectionsRequest,
} from "./contracts";
import { generateSectionA } from "./generate-section-a";
import { generateSectionB } from "./generate-section-b";

function generationSettings(
  session: JamSession,
  harmony: SectionHarmonySettings,
): GenerationSettings {
  return {
    styleId: session.styleId,
    ...harmony,
    bpm: session.bpm,
    meter: session.meter,
    timing: {
      sectionADurationSeconds: session.timeline[0]?.durationSeconds ?? 150,
      sectionBDurationSeconds: session.timeline[1]?.durationSeconds ?? 90,
      transitionWarningSeconds: session.transitionWarningSeconds,
    },
  };
}

export function regenerateSessionSections(
  request: RegenerateSessionSectionsRequest,
): GenerationResult<JamSession> {
  const { session, sectionLabels, sectionSettings, seed, styleProfile } = request;
  const targets = new Set<SectionLabel>(sectionLabels);
  const currentA = session.sections.find(({ label }) => label === "A");
  const currentB = session.sections.find(({ label }) => label === "B");

  if (!currentA || !currentB) {
    throw new Error("Сессия должна содержать темы A и B.");
  }

  let attempts = 0;
  let usedFallback = false;
  let sectionA: JamSection = currentA;
  let sectionB: JamSection = currentB;

  if (targets.has("A")) {
    const result = generateSectionA({
      seed: deriveSeed(seed, "section:A"),
      settings: generationSettings(session, sectionSettings.A),
      styleProfile,
    });
    sectionA = result.value;
    attempts += result.attempts;
    usedFallback ||= result.usedFallback;
  }

  if (targets.has("B")) {
    const result = generateSectionB({
      seed: deriveSeed(seed, "section:B"),
      settings: generationSettings(session, sectionSettings.B),
      styleProfile,
      sectionA,
    });
    sectionB = result.value;
    attempts += result.attempts;
    usedFallback ||= result.usedFallback;
  }

  const replacements = new Map([
    [currentA.id, sectionA],
    [currentB.id, sectionB],
  ]);
  const sections = session.sections.map(
    (section) => replacements.get(section.id) ?? section,
  );
  const sectionByOldId = new Map([
    [currentA.id, sectionA],
    [currentB.id, sectionB],
  ]);
  const timeline = session.timeline.map((step) => {
    const section = sectionByOldId.get(step.sectionId);
    if (!section) return step;

    return {
      ...step,
      id: `timeline-${deriveSeed(seed, `${step.id}:${section.label}`)}`,
      sectionId: section.id,
      transitionWarningSeconds: calculateTransitionWarningSeconds(
        section.bars,
        session.bpm,
        session.meter,
      ),
    };
  });
  const aSettings = sectionA.harmonySettings;

  return {
    value: {
      ...session,
      id: `session-${deriveSeed(seed, "session:id")}`,
      seed,
      title: `${styleProfile.name} ${aSettings.key} ${aSettings.mode}`,
      key: aSettings.key,
      mode: aSettings.mode,
      complexity: aSettings.complexity,
      harmonicFreedom: aSettings.harmonicFreedom,
      sections,
      timeline,
      transitionWarningSeconds: Math.max(
        ...timeline.map(({ transitionWarningSeconds }) =>
          transitionWarningSeconds,
        ),
      ),
      createdAt: new Date().toISOString(),
      schemaVersion: 2,
    },
    attempts,
    usedFallback,
  };
}

import type {
  GenerationSettings,
  JamSection,
  JamSession,
  SectionHarmonySettings,
  SectionLabel,
} from "../domain/types";
import { deriveSeed } from "../random";
import { calculateTransitionWarningSeconds } from "../tempo/transition-timing";
import { limitSessionHarmonicSpice } from "../harmony/limit-session-spice";
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

  if (!currentA) {
    throw new Error("Сессия должна содержать тему A.");
  }

  let attempts = 0;
  let usedFallback = false;
  let sectionA: JamSection = currentA;
  const generatedByLabel = new Map<SectionLabel, JamSection>();

  if (targets.has("A")) {
    const result = generateSectionA({
      seed: deriveSeed(seed, "section:A"),
      settings: generationSettings(session, sectionSettings.A),
      styleProfile,
    });
    sectionA = result.value;
    generatedByLabel.set("A", sectionA);
    attempts += result.attempts;
    usedFallback ||= result.usedFallback;
  }

  for (const label of ["B", "C", "D"] as const) {
    const current = session.sections.find((section) => section.label === label);
    if (!targets.has(label)) {
      if (current) generatedByLabel.set(label, current);
      continue;
    }

    const result = generateSectionB({
      seed: deriveSeed(seed, `section:${label}`),
      settings: generationSettings(session, sectionSettings[label]),
      styleProfile,
      sectionA,
      label,
      avoidSections: [sectionA, ...generatedByLabel.values()],
    });
    generatedByLabel.set(label, result.value);
    attempts += result.attempts;
    usedFallback ||= result.usedFallback;
  }

  if (!generatedByLabel.has("A")) generatedByLabel.set("A", sectionA);
  const generatedSections = (["A", "B", "C", "D"] as const)
    .map(
      (label) =>
        generatedByLabel.get(label) ??
        session.sections.find((section) => section.label === label),
    )
    .filter((section): section is JamSection => Boolean(section));
  const sections = limitSessionHarmonicSpice(
    generatedSections,
    targets,
    styleProfile,
    seed,
  );
  const sectionByOldId = new Map(
    session.sections.flatMap((oldSection) => {
      const replacement = sections.find(
        ({ label }) => label === oldSection.label,
      );
      return replacement ? [[oldSection.id, replacement] as const] : [];
    }),
  );
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

import type { GenerationSettings, JamSession, TimelineStep } from "../domain/types";
import { deriveSeed } from "../random";
import { resolveBpm } from "../tempo/resolve-bpm";
import { calculateTransitionWarningSeconds } from "../tempo/transition-timing";
import { resolveSectionDurationSeconds } from "../tempo/section-duration";
import type { GenerateSessionRequest, GenerationResult } from "./contracts";
import { generateSectionA } from "./generate-section-a";
import { generateSectionB } from "./generate-section-b";

function timelineStep(
  seed: string,
  index: number,
  sectionId: string,
  durationSeconds: number,
  transitionWarningSeconds: number,
): TimelineStep {
  return {
    id: `timeline-${deriveSeed(seed, `step:${index}`)}`,
    sectionId,
    durationSeconds,
    transitionWarningSeconds,
  };
}

export function generateSession(
  request: GenerateSessionRequest,
): GenerationResult<JamSession> {
  const { seed, settings, styleProfile } = request;
  const bpm = resolveBpm(settings.bpm, styleProfile.bpmRange, seed);
  const resolvedSettings: GenerationSettings = { ...settings, bpm };
  const sectionASettings: GenerationSettings = {
    ...resolvedSettings,
    ...request.sectionSettings?.A,
  };
  const sectionBSettings: GenerationSettings = {
    ...resolvedSettings,
    ...request.sectionSettings?.B,
  };
  const sectionAResult = generateSectionA({
    seed: deriveSeed(seed, "section:A"),
    settings: sectionASettings,
    styleProfile,
  });
  const sectionBResult = generateSectionB({
    seed: deriveSeed(seed, "section:B"),
    settings: sectionBSettings,
    styleProfile,
    sectionA: sectionAResult.value,
  });
  const sectionAWarning = calculateTransitionWarningSeconds(
    sectionAResult.value.bars,
    bpm,
    settings.meter,
  );
  const sectionBWarning = calculateTransitionWarningSeconds(
    sectionBResult.value.bars,
    bpm,
    settings.meter,
  );
  const sectionADuration = resolveSectionDurationSeconds({
    timing: settings.timing,
    label: "A",
    bars: sectionAResult.value.bars,
    bpm,
    meter: settings.meter,
    seed,
  });
  const sectionBDuration = resolveSectionDurationSeconds({
    timing: settings.timing,
    label: "B",
    bars: sectionBResult.value.bars,
    bpm,
    meter: settings.meter,
    seed,
  });
  const timeline = [
    timelineStep(
      seed,
      0,
      sectionAResult.value.id,
      sectionADuration,
      sectionAWarning,
    ),
    timelineStep(
      seed,
      1,
      sectionBResult.value.id,
      sectionBDuration,
      sectionBWarning,
    ),
    timelineStep(
      seed,
      2,
      sectionAResult.value.id,
      sectionADuration,
      sectionAWarning,
    ),
  ];

  return {
    value: {
      id: `session-${deriveSeed(seed, "session:id")}`,
      seed,
      title: `${styleProfile.name} ${settings.key} ${settings.mode}`,
      styleId: settings.styleId,
      key: settings.key,
      mode: settings.mode,
      bpm,
      meter: settings.meter,
      complexity: settings.complexity,
      harmonicFreedom: settings.harmonicFreedom,
      sections: [sectionAResult.value, sectionBResult.value],
      timeline,
      transitionWarningSeconds: Math.max(sectionAWarning, sectionBWarning),
      theme: "dark",
      createdAt: new Date().toISOString(),
      schemaVersion: 2,
    },
    attempts: sectionAResult.attempts + sectionBResult.attempts,
    usedFallback: sectionAResult.usedFallback || sectionBResult.usedFallback,
  };
}

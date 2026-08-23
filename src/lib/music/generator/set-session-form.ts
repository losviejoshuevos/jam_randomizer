import type { JamSession, SectionLabel, TimelineStep } from "../domain/types";
import { deriveSeed } from "../random";

export function sessionForm(session: JamSession): SectionLabel[] {
  const labelsById = new Map(
    session.sections.map((section) => [section.id, section.label] as const),
  );

  return session.timeline.flatMap((step) => {
    const label = labelsById.get(step.sectionId);
    return label ? [label] : [];
  });
}

export function setSessionForm(
  session: JamSession,
  form: readonly SectionLabel[],
): JamSession {
  if (form.length === 0 || !form.includes("A")) {
    throw new Error("Форма сессии должна содержать хотя бы одну тему A.");
  }

  const sectionsByLabel = new Map(
    session.sections.map((section) => [section.label, section] as const),
  );
  const previousSteps = new Map<SectionLabel, TimelineStep>();
  for (const step of session.timeline) {
    const label = session.sections.find(({ id }) => id === step.sectionId)?.label;
    if (label && !previousSteps.has(label)) previousSteps.set(label, step);
  }

  const timeline = form.map((label, index): TimelineStep => {
    const section = sectionsByLabel.get(label);
    if (!section) {
      throw new Error(`Сначала создайте тему ${label}.`);
    }
    const previous = previousSteps.get(label);
    return {
      id: `timeline-${deriveSeed(session.seed, `form:${index}:${label}`)}`,
      sectionId: section.id,
      durationSeconds: previous?.durationSeconds ?? 0,
      transitionWarningSeconds: previous?.transitionWarningSeconds ?? 0,
    };
  });

  const usedLabels = new Set(form);
  const sections = session.sections.filter(({ label }) => usedLabels.has(label));

  return { ...session, sections, timeline };
}

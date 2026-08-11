import type {
  JamSession,
  PitchClass,
  SectionLabel,
} from "../domain/types";
import { renderRomanChord } from "../rendering/render-roman-chord";

export function transposeSessionSections(
  session: JamSession,
  sectionLabels: readonly SectionLabel[],
  targetKeys: Partial<Record<SectionLabel, PitchClass>>,
): JamSession {
  const targets = new Set(sectionLabels);
  const sections = session.sections.map((section) => {
    if (!targets.has(section.label)) return section;
    const key = targetKeys[section.label] ?? section.harmonySettings.key;
    if (key === section.harmonySettings.key) return section;

    return {
      ...section,
      harmonySettings: { ...section.harmonySettings, key },
      chords: section.chords.map((chord) => ({
        ...chord,
        renderedSymbol: renderRomanChord(
          chord.roman,
          key,
          section.harmonySettings.mode,
        ),
      })),
    };
  });
  const sectionA = sections.find(({ label }) => label === "A");

  return {
    ...session,
    key: sectionA?.harmonySettings.key ?? session.key,
    title: sectionA
      ? `${session.styleId === "funk" ? "Funk" : session.styleId} ${sectionA.harmonySettings.key} ${sectionA.harmonySettings.mode}`
      : session.title,
    sections,
  };
}

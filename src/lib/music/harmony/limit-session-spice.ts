import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type { JamChord, JamSection, SectionLabel } from "../domain/types";
import { createSeededRandom, deriveSeed, weightedChoice } from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";
import { isComplexityAllowed } from "./availability";

interface SpiceLocation {
  sectionIndex: number;
  chordIndex: number;
  label: SectionLabel;
  halfBar: boolean;
}

function definitionAllowedInSection(
  definition: ChordDefinition,
  section: JamSection,
): boolean {
  const settings = section.harmonySettings;
  return (
    definition.allowedModes.includes(settings.mode) &&
    (definition.allowedComplexities?.includes(settings.complexity) ??
      isComplexityAllowed(definition.minimumComplexity, settings.complexity))
  );
}

function chordDefinition(
  chord: JamChord,
  section: JamSection,
  profile: StyleProfile,
): ChordDefinition | undefined {
  if (chord.source !== "generated") return undefined;

  return profile.chordVocabulary.find(
    (definition) =>
      definition.roman === chord.roman &&
      definitionAllowedInSection(definition, section),
  );
}

function isGeneratedSpice(
  chord: JamChord,
  section: JamSection,
  profile: StyleProfile,
): boolean {
  const definition = chordDefinition(chord, section, profile);
  return Boolean(definition && definition.harmonicPool !== "core");
}

function coreReplacement(
  chord: JamChord,
  section: JamSection,
  profile: StyleProfile,
  seed: string,
): JamChord {
  const core = profile.chordVocabulary.filter(
    (definition) =>
      definition.harmonicPool === "core" &&
      !definition.tags?.includes("must-resolve") &&
      definitionAllowedInSection(definition, section),
  );
  const sameFunction = core.filter(
    ({ harmonicFunction }) => harmonicFunction === chord.harmonicFunction,
  );
  const grooveSubstitute = core.filter(
    ({ harmonicFunction }) => harmonicFunction === "predominant",
  );
  const candidates =
    sameFunction.length > 0
      ? sameFunction
      : grooveSubstitute.length > 0
        ? grooveSubstitute
        : core;
  if (candidates.length === 0) return chord;

  const random = createSeededRandom(seed);
  const replacement = weightedChoice(
    candidates.map((definition) => ({
      value: definition,
      weight: definition.weight,
    })),
    random,
  );

  return {
    ...chord,
    roman: replacement.roman,
    renderedSymbol: renderRomanChord(
      replacement.roman,
      section.harmonySettings.key,
      section.harmonySettings.mode,
    ),
    harmonicFunction: replacement.harmonicFunction,
  };
}

export function limitSessionHarmonicSpice(
  sections: readonly JamSection[],
  mutableLabels: ReadonlySet<SectionLabel>,
  profile: StyleProfile,
  seed: string,
): JamSection[] {
  if (profile.maximumGeneratedNonCoreChords === undefined) {
    return [...sections];
  }

  const mutableSpice: SpiceLocation[] = [];
  let frozenSpiceCount = 0;

  sections.forEach((section, sectionIndex) => {
    section.chords.forEach((chord, chordIndex) => {
      if (!isGeneratedSpice(chord, section, profile)) return;
      if (mutableLabels.has(section.label)) {
        mutableSpice.push({
          sectionIndex,
          chordIndex,
          label: section.label,
          halfBar: chord.durationBars === 0.5,
        });
      } else {
        frozenSpiceCount += 1;
      }
    });
  });

  const allowedMutableSpice = Math.max(
    0,
    profile.maximumGeneratedNonCoreChords - frozenSpiceCount,
  );
  const random = createSeededRandom(deriveSeed(seed, "funk:session-spice"));
  const kept = new Set<SpiceLocation>();
  const remaining = [...mutableSpice];
  while (kept.size < allowedMutableSpice && remaining.length > 0) {
    const selected = weightedChoice(
      remaining.map((location) => ({
        value: location,
        weight: location.halfBar ? 12 : location.label === "A" ? 1 : 3,
      })),
      random,
    );
    kept.add(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }

  return sections.map((section, sectionIndex) => ({
    ...section,
    chords: section.chords.map((chord, chordIndex) => {
      const shouldReplace = mutableSpice.some(
        (location) =>
          location.sectionIndex === sectionIndex &&
          location.chordIndex === chordIndex &&
          !kept.has(location),
      );
      return shouldReplace
        ? coreReplacement(
            chord,
            section,
            profile,
            deriveSeed(seed, `funk:replace-spice:${section.label}:${chordIndex}`),
          )
        : chord;
    }),
  }));
}

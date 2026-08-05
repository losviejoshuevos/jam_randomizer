import type { StyleProfile } from "../domain/style-profile";
import type {
  GenerationSettings,
  HarmonicFunction,
  JamSection,
  SectionLabel,
} from "../domain/types";
import type { ValidationIssue, ValidationResult } from "../generator/contracts";
import { getAvailableChordDefinitions } from "../harmony/availability";

function includesFunction(
  values: readonly { value: HarmonicFunction }[],
  harmonicFunction: HarmonicFunction | null,
): boolean {
  return (
    harmonicFunction !== null &&
    values.some(({ value }) => value === harmonicFunction)
  );
}

export function validateGeneratedSection(
  section: JamSection,
  sectionLabel: SectionLabel,
  profile: StyleProfile,
  settings: GenerationSettings,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const rule = profile.sectionRules[sectionLabel];
  const firstChord = section.chords[0];
  const lastChord = section.chords.at(-1);
  const duration = section.chords.reduce(
    (total, chord) => total + chord.durationBars,
    0,
  );

  if (Math.abs(duration - section.bars) > Number.EPSILON) {
    issues.push({
      code: "SECTION_DURATION_MISMATCH",
      message: "Chord durations must fill the complete section.",
      sectionId: section.id,
    });
  }

  if (
    !firstChord ||
    !includesFunction(rule.allowedStartFunctions, firstChord.harmonicFunction)
  ) {
    issues.push({
      code: "INVALID_START_FUNCTION",
      message: "The section starts with a disallowed harmonic function.",
      sectionId: section.id,
    });
  }

  if (
    !lastChord ||
    !includesFunction(rule.allowedEndFunctions, lastChord.harmonicFunction)
  ) {
    issues.push({
      code: "INVALID_END_FUNCTION",
      message: "The section ends with a disallowed harmonic function.",
      sectionId: section.id,
    });
  }

  const distinctFunctions = new Set(
    section.chords.map(({ harmonicFunction }) => harmonicFunction),
  );
  if (distinctFunctions.size < rule.minimumDistinctFunctions) {
    issues.push({
      code: "NOT_ENOUGH_FUNCTIONS",
      message: "The section does not contain enough harmonic variety.",
      sectionId: section.id,
    });
  }

  let repeatedChordCount = 0;
  let previousSymbol: string | undefined;

  section.chords.forEach((chord, index) => {
    if (
      chord.renderedSymbol.trim().length === 0 ||
      !Number.isFinite(chord.startBar) ||
      !Number.isFinite(chord.durationBars) ||
      chord.durationBars <= 0
    ) {
      issues.push({
        code: "INVALID_CHORD_VALUE",
        message: "A chord contains an empty or non-finite value.",
        sectionId: section.id,
        chordId: chord.id,
      });
    }

    if (chord.renderedSymbol === previousSymbol) {
      repeatedChordCount += 1;
    } else {
      previousSymbol = chord.renderedSymbol;
      repeatedChordCount = 1;
    }

    if (repeatedChordCount > profile.validationRules.maximumSameChordInSequence) {
      issues.push({
        code: "TOO_MANY_REPEATED_CHORDS",
        message: "The same chord appears too many times in sequence.",
        sectionId: section.id,
        chordId: chord.id,
      });
    }

    if (
      chord.harmonicFunction === "passing" &&
      chord.durationBars > profile.validationRules.maximumPassingDurationBars
    ) {
      issues.push({
        code: "PASSING_CHORD_TOO_LONG",
        message: "A passing chord occupies too much time.",
        sectionId: section.id,
        chordId: chord.id,
      });
    }

    if (chord.source === "generated") {
      const allowed = getAvailableChordDefinitions(profile, settings).some(
        (definition) =>
          definition.roman === chord.roman &&
          definition.harmonicFunction === chord.harmonicFunction,
      );

      if (!allowed) {
        issues.push({
          code: "CHORD_NOT_ALLOWED",
          message: "A generated chord is not allowed by current settings.",
          sectionId: section.id,
          chordId: chord.id,
        });
      }

      if (
        chord.roman?.endsWith("/V") &&
        section.chords[index + 1]?.harmonicFunction !== "dominant"
      ) {
        issues.push({
          code: "UNRESOLVED_SECONDARY_DOMINANT",
          message: "The neighboring-key dominant must resolve to a V chord.",
          sectionId: section.id,
          chordId: chord.id,
        });
      }
    }
  });

  return issues.length === 0
    ? { valid: true, issues: [] }
    : { valid: false, issues };
}

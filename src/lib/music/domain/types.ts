export type Seed = string;
export type CardId = string;
export type SectionId = string;
export type TimelineStepId = string;
export type ChordId = string;
export type StyleId = string;
export type ThemeId = "classic" | "dark" | "high-contrast";

export type Complexity = "easy" | "medium" | "advanced";
export type HarmonicFreedom = "strict" | "colorful" | "adventurous";
export type Mode = "major" | "minor";
export type Meter = "4/4" | "3/4";
export type SectionLabel = "A" | "B" | "C" | "D";
export type GeneratorSectionLabel = "A" | "B";
export type SectionRole = "theme" | "development" | "bridge" | "coda";
export type SectionDurationMode = "random" | "seconds" | "squares";

export type PitchClass =
  | "C"
  | "C#"
  | "D"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "Ab"
  | "A"
  | "Bb"
  | "B";

export type HarmonicFunction =
  | "tonic"
  | "predominant"
  | "dominant"
  | "color"
  | "passing";

export type RomanChord = string;

export interface WeightedValue<T> {
  value: T;
  weight: number;
}

export interface ChordTiming {
  startBar: number;
  durationBars: number;
}

export interface GeneratedChord extends ChordTiming {
  id: ChordId;
  source: "generated";
  roman: RomanChord;
  renderedSymbol: string;
  harmonicFunction: HarmonicFunction;
}

export interface ManualChord extends ChordTiming {
  id: ChordId;
  source: "manual";
  roman: RomanChord;
  renderedSymbol: string;
  harmonicFunction: HarmonicFunction;
}

export type JamChord = GeneratedChord | ManualChord;

export interface JamSection {
  id: SectionId;
  label: SectionLabel;
  displayName: string;
  role: SectionRole;
  bars: number;
  repeats: number;
  locked: boolean;
  generationSeed: Seed;
  harmonySettings: SectionHarmonySettings;
  chords: JamChord[];
}

export interface SectionHarmonySettings {
  key: PitchClass;
  mode: Mode;
  complexity: Complexity;
  harmonicFreedom: HarmonicFreedom;
}

export interface TimelineStep {
  id: TimelineStepId;
  sectionId: SectionId;
  durationSeconds: number;
  transitionWarningSeconds: number;
}

export interface JamSession {
  id: CardId;
  seed: Seed;
  title: string;
  styleId: StyleId;
  /** Hidden, deterministic variant of a broad public style. */
  styleArchetypeId?: string;
  /** Session-wide chord treatment keeps all themes stylistically related. */
  styleChordTreatment?: "power" | "triads" | "mixed";
  key: PitchClass;
  mode: Mode;
  bpm: number;
  meter: Meter;
  complexity: Complexity;
  harmonicFreedom: HarmonicFreedom;
  sections: JamSection[];
  timeline: TimelineStep[];
  transitionWarningSeconds: number;
  theme: ThemeId;
  createdAt: string;
  schemaVersion: number;
}

export interface SessionTimingSettings {
  sectionADurationSeconds: number;
  sectionBDurationSeconds: number;
  sectionADurationMode?: SectionDurationMode;
  sectionBDurationMode?: SectionDurationMode;
  sectionASquares?: number;
  sectionBSquares?: number;
  sectionDurations?: Partial<
    Record<
      SectionLabel,
      {
        mode: SectionDurationMode;
        seconds: number;
        squares: number;
      }
    >
  >;
  transitionWarningSeconds: number;
}

export interface GenerationSettings {
  styleId: StyleId;
  key: PitchClass;
  mode: Mode;
  bpm: number | "random";
  meter: Meter;
  complexity: Complexity;
  harmonicFreedom: HarmonicFreedom;
  timing: SessionTimingSettings;
}

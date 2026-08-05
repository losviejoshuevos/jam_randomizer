import type {
  GenerationSettings,
  JamSection,
  JamSession,
  SectionId,
  Seed,
} from "../domain/types";
import type { StyleProfile } from "../domain/style-profile";

export interface ValidationIssue {
  code: string;
  message: string;
  sectionId?: SectionId;
  chordId?: string;
}

export type ValidationResult =
  | { valid: true; issues: [] }
  | { valid: false; issues: ValidationIssue[] };

export interface GenerationResult<T> {
  value: T;
  attempts: number;
  usedFallback: boolean;
}

export interface GenerateSessionRequest {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
}

export interface RegenerateSectionRequest {
  session: JamSession;
  sectionId: SectionId;
  seed: Seed;
  styleProfile: StyleProfile;
}

export interface MusicEngine {
  generateSession(
    request: GenerateSessionRequest,
  ): GenerationResult<JamSession>;
  regenerateSection(
    request: RegenerateSectionRequest,
  ): GenerationResult<JamSection>;
  validateSession(session: JamSession, profile: StyleProfile): ValidationResult;
}

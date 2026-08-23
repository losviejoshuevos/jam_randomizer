import { countryGrooveConfig } from "@/data/styles/country";
import { discoGrooveConfig } from "@/data/styles/disco";
import { neoSoulGrooveConfig } from "@/data/styles/neo-soul";
import { reggaeGrooveConfig } from "@/data/styles/reggae";
import type { StyleProfile } from "../domain/style-profile";
import type {
  GenerationSettings,
  JamSection,
  SectionLabel,
  Seed,
} from "../domain/types";
import type { GenerationResult } from "../generator/contracts";
import { generateGrooveStyleSection } from "./generate-groove-style-section";

const CONFIGS = {
  "neo-soul": neoSoulGrooveConfig,
  reggae: reggaeGrooveConfig,
  disco: discoGrooveConfig,
  country: countryGrooveConfig,
} as const;

export type ConfiguredGrooveKind = keyof typeof CONFIGS;

export function generateConfiguredGrooveSection(request: {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  label: SectionLabel;
  generatorKind: ConfiguredGrooveKind;
  avoidSections?: JamSection[];
}): GenerationResult<JamSection> {
  return generateGrooveStyleSection({
    seed: request.seed,
    settings: request.settings,
    styleProfile: request.styleProfile,
    label: request.label,
    avoidSections: request.avoidSections,
    config: CONFIGS[request.generatorKind],
  });
}

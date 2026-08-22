import type { StyleProfile } from "@/lib/music/domain/style-profile";
import { funkStyleProfile } from "./funk";
import {
  resolveRockStyleProfile,
  rockStyleDescriptor,
  type RockChordTreatment,
} from "./rock";
import {
  bluesStyleDescriptor,
  resolveBluesStyleProfile,
} from "./blues";
import {
  resolveSoulStyleProfile,
  soulStyleDescriptor,
} from "./soul";
import {
  jazzStyleDescriptor,
  resolveJazzStyleProfile,
} from "./jazz";
import {
  neoSoulStyleDescriptor,
  resolveNeoSoulStyleProfile,
} from "./neo-soul";
import {
  reggaeStyleDescriptor,
  resolveReggaeStyleProfile,
} from "./reggae";
import {
  discoStyleDescriptor,
  resolveDiscoStyleProfile,
} from "./disco";
import {
  countryStyleDescriptor,
  resolveCountryStyleProfile,
} from "./country";

export { funkStyleProfile } from "./funk";
export {
  ROCK_ARCHETYPES,
  ROCK_ARCHETYPE_WEIGHTS,
  resolveRockStyleProfile,
  resolveRockMode,
  rockArchetype,
  rockStyleDescriptor,
} from "./rock";
export {
  BLUES_ARCHETYPES,
  BLUES_ARCHETYPE_WEIGHTS,
  bluesArchetype,
  bluesStyleDescriptor,
  resolveBluesStyleProfile,
} from "./blues";
export {
  SOUL_ARCHETYPES,
  SOUL_ARCHETYPE_WEIGHTS,
  resolveSoulStyleProfile,
  soulArchetype,
  soulStyleDescriptor,
} from "./soul";
export {
  JAZZ_ARCHETYPES,
  JAZZ_ARCHETYPE_WEIGHTS,
  jazzArchetype,
  jazzStyleDescriptor,
  resolveJazzStyleProfile,
} from "./jazz";
export {
  NEO_SOUL_ARCHETYPES,
  neoSoulArchetype,
  neoSoulStyleDescriptor,
  resolveNeoSoulStyleProfile,
} from "./neo-soul";
export {
  REGGAE_ARCHETYPES,
  reggaeArchetype,
  reggaeStyleDescriptor,
  resolveReggaeStyleProfile,
} from "./reggae";
export {
  DISCO_ARCHETYPES,
  discoArchetype,
  discoStyleDescriptor,
  resolveDiscoStyleProfile,
} from "./disco";
export {
  COUNTRY_ARCHETYPES,
  countryArchetype,
  countryStyleDescriptor,
  resolveCountryStyleProfile,
} from "./country";

export const STYLE_OPTIONS = [
  { id: "funk", name: "Funk", bpmRange: funkStyleProfile.bpmRange },
  rockStyleDescriptor,
  bluesStyleDescriptor,
  soulStyleDescriptor,
  jazzStyleDescriptor,
  neoSoulStyleDescriptor,
  reggaeStyleDescriptor,
  discoStyleDescriptor,
  countryStyleDescriptor,
] as const;

export function styleDescriptor(styleId: string) {
  return STYLE_OPTIONS.find(({ id }) => id === styleId) ?? STYLE_OPTIONS[0];
}

export function resolveStyleProfile(
  styleId: string,
  seed: string,
  archetypeId?: string,
  chordTreatment?: RockChordTreatment,
): StyleProfile {
  if (styleId === "rock") {
    return resolveRockStyleProfile(seed, archetypeId, chordTreatment);
  }
  if (styleId === "blues") {
    return resolveBluesStyleProfile(seed, archetypeId);
  }
  if (styleId === "soul") {
    return resolveSoulStyleProfile(seed, archetypeId);
  }
  if (styleId === "jazz") {
    return resolveJazzStyleProfile(seed, archetypeId);
  }
  if (styleId === "neo-soul") {
    return resolveNeoSoulStyleProfile(seed, archetypeId);
  }
  if (styleId === "reggae") {
    return resolveReggaeStyleProfile(seed, archetypeId);
  }
  if (styleId === "disco") {
    return resolveDiscoStyleProfile(seed, archetypeId);
  }
  if (styleId === "country") {
    return resolveCountryStyleProfile(seed, archetypeId);
  }
  return funkStyleProfile;
}

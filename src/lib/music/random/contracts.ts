import type { Seed, WeightedValue } from "../domain/types";

export interface RandomSource {
  next(): number;
}

export interface SeededRandomFactory {
  create(seed: Seed): RandomSource;
  deriveSeed(parentSeed: Seed, namespace: string): Seed;
}

export type WeightedChoice = <T>(
  values: readonly WeightedValue<T>[],
  random: RandomSource,
) => T;

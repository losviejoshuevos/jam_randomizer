import type { WeightedValue } from "../domain/types";
import type { RandomSource } from "./contracts";
import { RandomError } from "./random-error";

export function weightedChoice<T>(
  values: readonly WeightedValue<T>[],
  random: RandomSource,
): T {
  if (values.length === 0) {
    throw new RandomError(
      "EMPTY_WEIGHTED_VALUES",
      "Weighted choice requires at least one value.",
    );
  }

  let totalWeight = 0;

  for (const { weight } of values) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RandomError(
        "INVALID_WEIGHT",
        "Weights must be finite non-negative numbers.",
      );
    }

    totalWeight += weight;
  }

  if (!Number.isFinite(totalWeight)) {
    throw new RandomError(
      "INVALID_WEIGHT",
      "The total weight must be a finite number.",
    );
  }

  if (totalWeight === 0) {
    throw new RandomError(
      "ZERO_TOTAL_WEIGHT",
      "At least one value must have a positive weight.",
    );
  }

  const randomValue = random.next();

  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RandomError(
      "INVALID_RANDOM_VALUE",
      "Random sources must return a finite number in the [0, 1) interval.",
    );
  }

  const threshold = randomValue * totalWeight;
  let cumulativeWeight = 0;
  let lastPositiveValue: T | undefined;

  for (const entry of values) {
    if (entry.weight === 0) {
      continue;
    }

    lastPositiveValue = entry.value;
    cumulativeWeight += entry.weight;

    if (threshold < cumulativeWeight) {
      return entry.value;
    }
  }

  // Floating-point rounding can only reach this path at the upper boundary.
  return lastPositiveValue as T;
}

import type { Seed } from "../domain/types";
import type { RandomSource, SeededRandomFactory } from "./contracts";
import { RandomError } from "./random-error";

const UINT32_RANGE = 4_294_967_296;
const STATE_INCREMENT = 0x6d2b79f5;

function assertNonEmpty(value: string, code: "EMPTY_SEED" | "EMPTY_NAMESPACE") {
  if (value.trim().length === 0) {
    throw new RandomError(code, `${code === "EMPTY_SEED" ? "Seed" : "Namespace"} must not be empty.`);
  }
}

function hashString(value: string, salt: number): number {
  let hash = (1779033703 ^ value.length ^ salt) >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);

  return (hash ^ (hash >>> 16)) >>> 0;
}

class Mulberry32Random implements RandomSource {
  private state: number;

  constructor(seed: Seed) {
    assertNonEmpty(seed, "EMPTY_SEED");
    this.state = hashString(seed, 0);
  }

  next(): number {
    this.state = (this.state + STATE_INCREMENT) >>> 0;

    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  }
}

export function createSeededRandom(seed: Seed): RandomSource {
  return new Mulberry32Random(seed);
}

export function deriveSeed(parentSeed: Seed, namespace: string): Seed {
  assertNonEmpty(parentSeed, "EMPTY_SEED");
  assertNonEmpty(namespace, "EMPTY_NAMESPACE");

  const input = `${parentSeed.length}:${parentSeed}|${namespace.length}:${namespace}`;
  const firstHalf = hashString(input, 0).toString(16).padStart(8, "0");
  const secondHalf = hashString(input, 0x9e3779b9).toString(16).padStart(8, "0");

  return `${firstHalf}${secondHalf}`;
}

export const seededRandomFactory: SeededRandomFactory = {
  create: createSeededRandom,
  deriveSeed,
};

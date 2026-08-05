export type RandomErrorCode =
  | "EMPTY_SEED"
  | "EMPTY_NAMESPACE"
  | "EMPTY_WEIGHTED_VALUES"
  | "INVALID_WEIGHT"
  | "ZERO_TOTAL_WEIGHT"
  | "INVALID_RANDOM_VALUE";

export class RandomError extends Error {
  constructor(
    public readonly code: RandomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RandomError";
  }
}

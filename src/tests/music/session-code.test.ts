import { describe, expect, it } from "vitest";
import { addArchetypeToSessionCode } from "@/lib/music/session-code";

describe("addArchetypeToSessionCode", () => {
  it("adds a readable Rock archetype marker to a session code", () => {
    expect(
      addArchetypeToSessionCode("ROCK-4Q35X-AFWGF", "rock-ballad"),
    ).toBe("ROCK-ROCK_BALLAD-4Q35X-AFWGF");
  });

  it("leaves codes without an archetype unchanged", () => {
    expect(addArchetypeToSessionCode("FUNK-4Q35X-AFWGF")).toBe(
      "FUNK-4Q35X-AFWGF",
    );
  });

  it("does not add the same marker twice", () => {
    expect(
      addArchetypeToSessionCode(
        "ROCK-CLASSIC_MODAL-4Q35X-AFWGF",
        "classic-modal",
      ),
    ).toBe("ROCK-CLASSIC_MODAL-4Q35X-AFWGF");
  });

  it("adds a Blues archetype marker using the same debug format", () => {
    expect(
      addArchetypeToSessionCode("BLUES-4Q35X-AFWGF", "texas-shuffle"),
    ).toBe("BLUES-TEXAS_SHUFFLE-4Q35X-AFWGF");
  });
});

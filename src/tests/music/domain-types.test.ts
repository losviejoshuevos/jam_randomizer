import { describe, expect, it } from "vitest";
import type { JamSession } from "@/lib/music/domain/types";

describe("JamSession timeline", () => {
  it("represents the agreed A → B → A stage flow", () => {
    const session: JamSession = {
      id: "session-1",
      seed: "seed-1",
      title: "Friday jam",
      styleId: "funk",
      key: "C",
      mode: "minor",
      bpm: 100,
      meter: "4/4",
      complexity: "easy",
      harmonicFreedom: "colorful",
      sections: [
        {
          id: "section-a",
          label: "A",
          displayName: "Theme A",
          role: "theme",
          bars: 8,
          repeats: 1,
          locked: false,
          generationSeed: "seed-a",
          chords: [],
        },
        {
          id: "section-b",
          label: "B",
          displayName: "Development B",
          role: "bridge",
          bars: 4,
          repeats: 1,
          locked: false,
          generationSeed: "seed-b",
          chords: [],
        },
      ],
      timeline: [
        {
          id: "step-1",
          sectionId: "section-a",
          durationSeconds: 150,
          transitionWarningSeconds: 22,
        },
        {
          id: "step-2",
          sectionId: "section-b",
          durationSeconds: 90,
          transitionWarningSeconds: 12,
        },
        {
          id: "step-3",
          sectionId: "section-a",
          durationSeconds: 150,
          transitionWarningSeconds: 22,
        },
      ],
      transitionWarningSeconds: 10,
      theme: "dark",
      createdAt: "2026-08-05T00:00:00.000Z",
      schemaVersion: 1,
    };

    expect(session.timeline.map((step) => step.sectionId)).toEqual([
      "section-a",
      "section-b",
      "section-a",
    ]);
  });
});

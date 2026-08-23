import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import { generateSession } from "@/lib/music/generator";
import {
  createSessionUrl,
  decodeSessionPayload,
  encodeSessionPayload,
} from "@/lib/sharing/session-payload";
import { parseSessionFile, serializeSessionFile } from "@/lib/sharing/session-file";

function exampleSession() {
  return generateSession({
    seed: "portable-session",
    settings: {
      styleId: "funk",
      key: "Eb",
      mode: "minor",
      bpm: 104,
      meter: "4/4",
      complexity: "medium",
      harmonicFreedom: "colorful",
      timing: {
        sectionADurationSeconds: 150,
        sectionBDurationSeconds: 90,
        transitionWarningSeconds: 10,
      },
    },
    styleProfile: funkStyleProfile,
  }).value;
}

describe("portable JamSession", () => {
  it("round-trips through a compressed URL payload", () => {
    const session = exampleSession();
    expect(decodeSessionPayload(encodeSessionPayload(session))).toEqual(session);
    expect(createSessionUrl(session, "https://jamrandomizer.ru")).toContain("/stage?jam=");
  });

  it("round-trips through a readable export file", () => {
    const session = exampleSession();
    expect(parseSessionFile(serializeSessionFile(session))).toEqual(session);
  });

  it("rejects damaged payloads and unrelated files", () => {
    expect(() => decodeSessionPayload("broken")).toThrow(/повреждена/u);
    expect(() => parseSessionFile('{"hello":"world"}')).toThrow(/не поддерживаемый/u);
  });
});

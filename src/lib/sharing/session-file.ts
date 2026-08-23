import type { JamSession } from "../music/domain/types";
import { isJamSession } from "./session-payload";

export const JAM_SESSION_FILE_EXTENSION = ".jam.json";

interface JamSessionFile {
  format: "jam-randomizer-session-file";
  version: 1;
  exportedAt: string;
  session: JamSession;
}

export function serializeSessionFile(session: JamSession): string {
  const file: JamSessionFile = {
    format: "jam-randomizer-session-file",
    version: 1,
    exportedAt: new Date().toISOString(),
    session,
  };
  return JSON.stringify(file, null, 2);
}

export function parseSessionFile(serialized: string): JamSession {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") throw new Error("invalid");
    const file = parsed as Partial<JamSessionFile>;
    if (
      file.format !== "jam-randomizer-session-file" ||
      file.version !== 1 ||
      !isJamSession(file.session)
    ) {
      throw new Error("invalid");
    }
    return file.session;
  } catch {
    throw new Error("Это не поддерживаемый файл Jam Randomizer.");
  }
}

export function sessionFileName(session: JamSession): string {
  const safeSeed = session.seed.replace(/[^a-z0-9_-]+/giu, "-");
  return `${safeSeed}${JAM_SESSION_FILE_EXTENSION}`;
}

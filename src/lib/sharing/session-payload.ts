import { compressSync, decompressSync, strFromU8, strToU8 } from "fflate";
import type { JamSession } from "../music/domain/types";

export const SESSION_QUERY_KEY = "jam";
export const SESSION_PAYLOAD_VERSION = 1;

interface PortableSessionEnvelope {
  format: "jam-randomizer-session";
  version: number;
  session: JamSession;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function isJamSession(value: unknown): value is JamSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<JamSession>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.seed === "string" &&
    typeof candidate.styleId === "string" &&
    typeof candidate.bpm === "number" &&
    (candidate.meter === "4/4" || candidate.meter === "3/4") &&
    Array.isArray(candidate.sections) &&
    candidate.sections.length > 0 &&
    Array.isArray(candidate.timeline) &&
    candidate.timeline.length > 0
  );
}

export function encodeSessionPayload(session: JamSession): string {
  const envelope: PortableSessionEnvelope = {
    format: "jam-randomizer-session",
    version: SESSION_PAYLOAD_VERSION,
    session,
  };
  return bytesToBase64Url(compressSync(strToU8(JSON.stringify(envelope)), { level: 9 }));
}

export function decodeSessionPayload(payload: string): JamSession {
  try {
    const parsed: unknown = JSON.parse(
      strFromU8(decompressSync(base64UrlToBytes(payload))),
    );
    if (!parsed || typeof parsed !== "object") throw new Error("invalid");
    const envelope = parsed as Partial<PortableSessionEnvelope>;
    if (
      envelope.format !== "jam-randomizer-session" ||
      envelope.version !== SESSION_PAYLOAD_VERSION ||
      !isJamSession(envelope.session)
    ) {
      throw new Error("invalid");
    }
    return envelope.session;
  } catch {
    throw new Error("Ссылка Jam Randomizer повреждена или создана несовместимой версией.");
  }
}

export function createSessionUrl(
  session: JamSession,
  origin: string,
  options: { roomId?: string; guest?: boolean } = {},
): string {
  const url = new URL("/stage", origin);
  url.searchParams.set(SESSION_QUERY_KEY, encodeSessionPayload(session));
  if (options.roomId) url.searchParams.set("room", options.roomId);
  if (options.guest) url.searchParams.set("role", "guest");
  return url.toString();
}

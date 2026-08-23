import { publicRoomState, type CreatedRoom, type RoomStatePatch, type StoredRoom } from "./room-types";
import { roomStore, roomTtlSeconds } from "./room-store";

const ROOM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomString(length: number, alphabet = ROOM_ALPHABET): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createRoom(
  sessionId: string,
  remainingSeconds: number,
  sessionPayload: string,
): Promise<CreatedRoom> {
  const store = roomStore();
  let roomId = randomString(7);
  while (await store.get(roomId)) roomId = randomString(7);

  const hostToken = randomString(32, `${ROOM_ALPHABET.toLowerCase()}${ROOM_ALPHABET}`);
  const now = new Date();
  const room: StoredRoom = {
    roomId,
    sessionId,
    sessionPayload,
    hostTokenHash: await sha256(hostToken),
    stepIndex: 0,
    remainingSeconds: Math.max(0, remainingSeconds),
    phase: "idle",
    beatIndex: 0,
    squareBeat: 0,
    beatAnchorAt: null,
    hostSeenAt: now.toISOString(),
    revision: 1,
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + roomTtlSeconds() * 1000).toISOString(),
  };
  await store.set(room);
  return { room: publicRoomState(room), hostToken, storage: store.kind };
}

export async function updateRoom(
  roomId: string,
  hostToken: string,
  patch: RoomStatePatch,
): Promise<StoredRoom | null | "forbidden"> {
  const store = roomStore();
  const current = await store.get(roomId);
  if (!current) return null;
  if ((await sha256(hostToken)) !== current.hostTokenHash) return "forbidden";

  const now = new Date();
  const hasBeatAnchor =
    typeof patch.beatIndex === "number" ||
    typeof patch.squareBeat === "number";
  const startLeadMs =
    typeof patch.startLeadMs === "number"
      ? Math.min(3_000, Math.max(0, Math.round(patch.startLeadMs)))
      : 0;
  const next: StoredRoom = {
    ...current,
    ...(typeof patch.sessionId === "string" ? { sessionId: patch.sessionId } : {}),
    ...(typeof patch.sessionPayload === "string"
      ? { sessionPayload: patch.sessionPayload }
      : {}),
    ...(typeof patch.stepIndex === "number"
      ? { stepIndex: Math.max(0, Math.floor(patch.stepIndex)) }
      : {}),
    ...(typeof patch.remainingSeconds === "number"
      ? { remainingSeconds: Math.max(0, patch.remainingSeconds) }
      : {}),
    ...(patch.phase ? { phase: patch.phase } : {}),
    ...(typeof patch.beatIndex === "number"
      ? { beatIndex: Math.max(0, Math.floor(patch.beatIndex)) }
      : {}),
    ...(typeof patch.squareBeat === "number"
      ? { squareBeat: Math.max(0, Math.floor(patch.squareBeat)) }
      : {}),
    ...(hasBeatAnchor
      ? { beatAnchorAt: new Date(now.getTime() + startLeadMs).toISOString() }
      : {}),
    hostSeenAt: now.toISOString(),
    revision: current.revision + 1,
    updatedAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + (patch.phase === "terminated" ? 60 : roomTtlSeconds()) * 1000,
    ).toISOString(),
  };
  await store.set(next);
  return next;
}

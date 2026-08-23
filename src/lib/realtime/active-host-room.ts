import type { CreatedRoom } from "./room-types";

const ACTIVE_HOST_ROOM_KEY = "jam-randomizer:active-host-room";

export interface ActiveHostRoom {
  roomId: string;
  hostToken: string;
  storage: CreatedRoom["storage"];
}

export function saveActiveHostRoom(room: CreatedRoom): ActiveHostRoom {
  const active = {
    roomId: room.room.roomId,
    hostToken: room.hostToken,
    storage: room.storage,
  };
  window.sessionStorage.setItem(ACTIVE_HOST_ROOM_KEY, JSON.stringify(active));
  return active;
}

export function loadActiveHostRoom(): ActiveHostRoom | null {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(ACTIVE_HOST_ROOM_KEY) ?? "null",
    ) as Partial<ActiveHostRoom> | null;
    return parsed &&
      typeof parsed.roomId === "string" &&
      typeof parsed.hostToken === "string" &&
      (parsed.storage === "memory" || parsed.storage === "upstash")
      ? (parsed as ActiveHostRoom)
      : null;
  } catch {
    return null;
  }
}

export function clearActiveHostRoom(): void {
  window.sessionStorage.removeItem(ACTIVE_HOST_ROOM_KEY);
}

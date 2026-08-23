import type {
  CreatedRoom,
  PublicRoomState,
  RoomStatePatch,
} from "./room-types";

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`room_request_failed:${response.status}`);
  return (await response.json()) as T;
}

export async function createLiveRoom(
  sessionId: string,
  remainingSeconds: number,
  sessionPayload: string,
): Promise<CreatedRoom> {
  return responseJson<CreatedRoom>(
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, remainingSeconds, sessionPayload }),
    }),
  );
}

export async function publishRoomState(
  roomId: string,
  hostToken: string,
  patch: RoomStatePatch,
): Promise<PublicRoomState> {
  return responseJson<PublicRoomState>(
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}/state`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hostToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }),
  );
}

export async function getRoomState(roomId: string): Promise<PublicRoomState> {
  return responseJson<PublicRoomState>(
    await fetch(`/api/rooms/${encodeURIComponent(roomId)}/state`, {
      cache: "no-store",
    }),
  );
}

export interface ServerClockSync {
  offsetMs: number;
  roundTripMs: number;
}

export async function measureServerClock(samples = 3): Promise<ServerClockSync> {
  const attempts: ServerClockSync[] = [];
  for (let index = 0; index < samples; index += 1) {
    const startedAt = Date.now();
    const response = await fetch(`/api/time?sample=${startedAt}-${index}`, {
      cache: "no-store",
    });
    const { serverTimeMs } = await responseJson<{ serverTimeMs: number }>(response);
    const receivedAt = Date.now();
    attempts.push({
      offsetMs: serverTimeMs - (startedAt + receivedAt) / 2,
      roundTripMs: receivedAt - startedAt,
    });
  }
  return attempts.reduce((best, sample) =>
    sample.roundTripMs < best.roundTripMs ? sample : best,
  );
}

export function subscribeToRoom(
  roomId: string,
  onState: (state: PublicRoomState) => void,
  onExpired: () => void,
  onConnectionChange?: (connected: boolean) => void,
  onHostConnectionChange?: (connected: boolean) => void,
  onTerminated?: () => void,
): () => void {
  const source = new EventSource(
    `/api/rooms/${encodeURIComponent(roomId)}/events`,
  );
  source.onopen = () => onConnectionChange?.(true);
  source.onerror = () => onConnectionChange?.(false);
  source.addEventListener("state", (event) => {
    onState(JSON.parse((event as MessageEvent<string>).data) as PublicRoomState);
  });
  source.addEventListener("expired", () => {
    onExpired();
    source.close();
  });
  source.addEventListener("host-disconnected", () =>
    onHostConnectionChange?.(false),
  );
  source.addEventListener("host-connected", () =>
    onHostConnectionChange?.(true),
  );
  source.addEventListener("host-timeout", () => {
    onTerminated?.();
    source.close();
  });
  source.addEventListener("terminated", () => {
    onTerminated?.();
    source.close();
  });
  return () => source.close();
}

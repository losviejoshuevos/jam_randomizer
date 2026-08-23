export type RoomPlaybackPhase =
  | "idle"
  | "playing"
  | "paused"
  | "complete"
  | "waiting"
  | "terminated";

export interface PublicRoomState {
  roomId: string;
  sessionId: string;
  sessionPayload: string;
  stepIndex: number;
  remainingSeconds: number;
  phase: RoomPlaybackPhase;
  beatIndex: number;
  squareBeat: number;
  beatAnchorAt: string | null;
  hostSeenAt: string;
  revision: number;
  updatedAt: string;
  expiresAt: string;
}

export interface StoredRoom extends PublicRoomState {
  hostTokenHash: string;
}

export interface RoomStatePatch {
  sessionId?: string;
  sessionPayload?: string;
  stepIndex?: number;
  remainingSeconds?: number;
  phase?: RoomPlaybackPhase;
  beatIndex?: number;
  squareBeat?: number;
  startLeadMs?: number;
  heartbeat?: boolean;
}

export interface CreatedRoom {
  room: PublicRoomState;
  hostToken: string;
  storage: "memory" | "upstash";
}

export function publicRoomState(room: StoredRoom): PublicRoomState {
  return {
    roomId: room.roomId,
    sessionId: room.sessionId,
    sessionPayload: room.sessionPayload ?? "",
    stepIndex: room.stepIndex,
    remainingSeconds: room.remainingSeconds,
    phase: room.phase,
    beatIndex: room.beatIndex ?? 0,
    squareBeat: room.squareBeat ?? 0,
    beatAnchorAt: room.beatAnchorAt ?? null,
    hostSeenAt: room.hostSeenAt ?? room.updatedAt,
    revision: room.revision,
    updatedAt: room.updatedAt,
    expiresAt: room.expiresAt,
  };
}

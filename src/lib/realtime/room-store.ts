import { Redis } from "@upstash/redis";
import type { StoredRoom } from "./room-types";

export const DEFAULT_ROOM_TTL_SECONDS = 2 * 60 * 60;

export interface RoomStore {
  readonly kind: "memory" | "upstash";
  get(roomId: string): Promise<StoredRoom | null>;
  set(room: StoredRoom): Promise<void>;
  delete(roomId: string): Promise<void>;
  subscribe(
    roomId: string,
    onRoom: (room: StoredRoom | null) => void,
    onError?: (error: Error) => void,
  ): () => void;
}

export class RoomStoreConfigurationError extends Error {
  constructor() {
    super("Upstash Redis is required for production rooms.");
    this.name = "RoomStoreConfigurationError";
  }
}

declare global {
  var __jamRandomizerRooms: Map<string, StoredRoom> | undefined;
  var __jamRandomizerRoomListeners:
    | Map<string, Set<(room: StoredRoom | null) => void>>
    | undefined;
}

function memoryRooms(): Map<string, StoredRoom> {
  globalThis.__jamRandomizerRooms ??= new Map<string, StoredRoom>();
  return globalThis.__jamRandomizerRooms;
}

function memoryRoomListeners(): Map<
  string,
  Set<(room: StoredRoom | null) => void>
> {
  globalThis.__jamRandomizerRoomListeners ??= new Map();
  return globalThis.__jamRandomizerRoomListeners;
}

function notifyMemoryRoom(roomId: string, room: StoredRoom | null): void {
  for (const listener of memoryRoomListeners().get(roomId) ?? []) {
    listener(room);
  }
}

const memoryStore: RoomStore = {
  kind: "memory",
  async get(roomId) {
    const room = memoryRooms().get(roomId) ?? null;
    if (room && Date.parse(room.expiresAt) <= Date.now()) {
      memoryRooms().delete(roomId);
      return null;
    }
    return room;
  },
  async set(room) {
    memoryRooms().set(room.roomId, room);
    notifyMemoryRoom(room.roomId, room);
  },
  async delete(roomId) {
    memoryRooms().delete(roomId);
    notifyMemoryRoom(roomId, null);
  },
  subscribe(roomId, onRoom) {
    const listeners = memoryRoomListeners();
    const roomListeners = listeners.get(roomId) ?? new Set();
    roomListeners.add(onRoom);
    listeners.set(roomId, roomListeners);
    return () => {
      roomListeners.delete(onRoom);
      if (roomListeners.size === 0) listeners.delete(roomId);
    };
  },
};

function redisCredentials() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

function createRedisStore(url: string, token: string): RoomStore {
  const redis = new Redis({ url, token });
  const roomKey = (roomId: string) => `jam-room:${roomId}`;
  const roomChannel = (roomId: string) => `jam-room-events:${roomId}`;
  return {
    kind: "upstash",
    async get(roomId) {
      return (await redis.get<StoredRoom>(roomKey(roomId))) ?? null;
    },
    async set(room) {
      const ttl = Math.max(
        1,
        Math.ceil((Date.parse(room.expiresAt) - Date.now()) / 1000),
      );
      await redis
        .pipeline()
        .set(roomKey(room.roomId), room, { ex: ttl })
        .publish(roomChannel(room.roomId), { type: "state", room })
        .exec();
    },
    async delete(roomId) {
      await redis
        .pipeline()
        .del(roomKey(roomId))
        .publish(roomChannel(roomId), { type: "deleted" })
        .exec();
    },
    subscribe(roomId, onRoom, onError) {
      type RoomEvent =
        | { type: "state"; room: StoredRoom }
        | { type: "deleted" };
      const subscriber = redis.subscribe<RoomEvent>(roomChannel(roomId));
      subscriber.on("message", ({ message }) => {
        if (message?.type === "state" && message.room) {
          onRoom(message.room);
        } else if (message?.type === "deleted") {
          onRoom(null);
        }
      });
      subscriber.on("error", (error) => onError?.(error));
      return () => {
        subscriber.removeAllListeners();
        void subscriber.unsubscribe();
      };
    },
  };
}

let cachedStore: RoomStore | null = null;

export function roomStore(): RoomStore {
  if (cachedStore) return cachedStore;
  const credentials = redisCredentials();
  if (!credentials && process.env.NODE_ENV === "production") {
    throw new RoomStoreConfigurationError();
  }
  cachedStore = credentials
    ? createRedisStore(credentials.url, credentials.token)
    : memoryStore;
  return cachedStore;
}

export function roomTtlSeconds(): number {
  const configured = Number(process.env.JAM_ROOM_TTL_SECONDS);
  return Number.isFinite(configured) && configured > 0
    ? Math.round(configured)
    : DEFAULT_ROOM_TTL_SECONDS;
}

export function resetRoomStoreForTests(): void {
  cachedStore = null;
  memoryRooms().clear();
  memoryRoomListeners().clear();
}

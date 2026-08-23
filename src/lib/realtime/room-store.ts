import { Redis } from "@upstash/redis";
import type { StoredRoom } from "./room-types";

export const DEFAULT_ROOM_TTL_SECONDS = 2 * 60 * 60;

export interface RoomStore {
  readonly kind: "memory" | "upstash";
  get(roomId: string): Promise<StoredRoom | null>;
  set(room: StoredRoom): Promise<void>;
  delete(roomId: string): Promise<void>;
}

export class RoomStoreConfigurationError extends Error {
  constructor() {
    super("Upstash Redis is required for production rooms.");
    this.name = "RoomStoreConfigurationError";
  }
}

declare global {
  var __jamRandomizerRooms: Map<string, StoredRoom> | undefined;
}

function memoryRooms(): Map<string, StoredRoom> {
  globalThis.__jamRandomizerRooms ??= new Map<string, StoredRoom>();
  return globalThis.__jamRandomizerRooms;
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
  },
  async delete(roomId) {
    memoryRooms().delete(roomId);
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
  return {
    kind: "upstash",
    async get(roomId) {
      return (await redis.get<StoredRoom>(`jam-room:${roomId}`)) ?? null;
    },
    async set(room) {
      const ttl = Math.max(
        1,
        Math.ceil((Date.parse(room.expiresAt) - Date.now()) / 1000),
      );
      await redis.set(`jam-room:${room.roomId}`, room, { ex: ttl });
    },
    async delete(roomId) {
      await redis.del(`jam-room:${roomId}`);
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
}

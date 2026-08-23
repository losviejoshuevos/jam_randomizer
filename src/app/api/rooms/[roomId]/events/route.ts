import { roomStore, type RoomStore } from "@/lib/realtime/room-store";
import { publicRoomState, type StoredRoom } from "@/lib/realtime/room-types";
import { liveRoomsEnabled } from "@/lib/realtime/live-rooms-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const HOST_DISCONNECTED_AFTER_MS = 15_000;
const HOST_TIMEOUT_AFTER_MS = 5 * 60 * 1_000;
const STREAM_LIFETIME_MS = 285_000;

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!liveRoomsEnabled()) {
    return new Response("Live rooms are disabled.", { status: 503 });
  }
  const { roomId } = await context.params;
  let store: RoomStore;
  try {
    store = roomStore();
  } catch (error) {
    if (error instanceof Error && error.name === "RoomStoreConfigurationError") {
      return new Response("Redis is not configured.", { status: 503 });
    }
    throw error;
  }

  const encoder = new TextEncoder();
  let closed = false;
  let closeStream = () => {
    closed = true;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastRevision = -1;
      let lastHostConnected = true;
      let latestRoom: StoredRoom | null = null;
      let unsubscribe = () => {};
      let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
      let livenessTimer: ReturnType<typeof setInterval> | null = null;
      let lifetimeTimer: ReturnType<typeof setTimeout> | null = null;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const cleanup = () => {
        unsubscribe();
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (livenessTimer) clearInterval(livenessTimer);
        if (lifetimeTimer) clearTimeout(lifetimeTimer);
        request.signal.removeEventListener("abort", closeStream);
      };

      closeStream = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // The browser may already have cancelled the stream.
        }
      };

      const evaluateLiveness = () => {
        if (!latestRoom || closed) return;
        const now = Date.now();
        if (Date.parse(latestRoom.expiresAt) <= now) {
          send("expired", { roomId });
          closeStream();
          return;
        }
        const hostSilenceMs =
          now - Date.parse(latestRoom.hostSeenAt ?? latestRoom.updatedAt);
        if (hostSilenceMs >= HOST_TIMEOUT_AFTER_MS) {
          send("host-timeout", { roomId });
          closeStream();
          void store.delete(roomId).catch(() => {
            // The key will still disappear through its Redis TTL.
          });
          return;
        }
        const hostConnected = hostSilenceMs < HOST_DISCONNECTED_AFTER_MS;
        if (hostConnected !== lastHostConnected) {
          lastHostConnected = hostConnected;
          send(hostConnected ? "host-connected" : "host-disconnected", {
            roomId,
            hostSeenAt: latestRoom.hostSeenAt,
          });
        }
      };

      const applyRoom = (room: StoredRoom | null) => {
        if (closed) return;
        if (!room) {
          send("expired", { roomId });
          closeStream();
          return;
        }
        latestRoom = room;
        evaluateLiveness();
        if (closed || room.revision === lastRevision) return;
        lastRevision = room.revision;
        send("state", publicRoomState(room));
        if (room.phase === "terminated") {
          send("terminated", { roomId });
          closeStream();
        }
      };

      request.signal.addEventListener("abort", closeStream, { once: true });
      unsubscribe = store.subscribe(roomId, applyRoom, closeStream);

      try {
        applyRoom(await store.get(roomId));
      } catch {
        closeStream();
        return;
      }
      if (closed) return;

      keepAliveTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15_000);
      livenessTimer = setInterval(evaluateLiveness, 1_000);
      lifetimeTimer = setTimeout(closeStream, STREAM_LIFETIME_MS);
    },
    cancel() {
      closeStream();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

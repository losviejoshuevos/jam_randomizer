import { roomStore } from "@/lib/realtime/room-store";
import { publicRoomState } from "@/lib/realtime/room-types";
import { liveRoomsEnabled } from "@/lib/realtime/live-rooms-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!liveRoomsEnabled()) {
    return new Response("Live rooms are disabled.", { status: 503 });
  }
  const { roomId } = await context.params;
  try {
    await roomStore().get(roomId);
  } catch (error) {
    if (error instanceof Error && error.name === "RoomStoreConfigurationError") {
      return new Response("Redis is not configured.", { status: 503 });
    }
    throw error;
  }
  const encoder = new TextEncoder();
  let lastRevision = -1;
  let lastHostConnected = true;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      request.signal.addEventListener("abort", close, { once: true });
      const startedAt = Date.now();
      while (!closed && Date.now() - startedAt < 285_000) {
        const room = await roomStore().get(roomId);
        if (!room) {
          send("expired", { roomId });
          close();
          break;
        }
        const hostSilenceMs = Date.now() - Date.parse(room.hostSeenAt ?? room.updatedAt);
        if (hostSilenceMs >= 5 * 60 * 1_000) {
          await roomStore().delete(roomId);
          send("host-timeout", { roomId });
          close();
          break;
        }
        const hostConnected = hostSilenceMs < 15_000;
        if (hostConnected !== lastHostConnected) {
          lastHostConnected = hostConnected;
          send(hostConnected ? "host-connected" : "host-disconnected", {
            roomId,
            hostSeenAt: room.hostSeenAt,
          });
        }
        if (room.revision !== lastRevision) {
          lastRevision = room.revision;
          send("state", publicRoomState(room));
          if (room.phase === "terminated") {
            send("terminated", { roomId });
            close();
            break;
          }
        } else {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        }
        await new Promise((resolve) =>
          setTimeout(resolve, room.phase === "waiting" ? 5_000 : 1_000),
        );
      }
      close();
    },
    cancel() {
      closed = true;
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

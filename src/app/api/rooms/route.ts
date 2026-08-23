import { NextResponse } from "next/server";
import { createRoom } from "@/lib/realtime/room-service";
import { liveRoomsEnabled } from "@/lib/realtime/live-rooms-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!liveRoomsEnabled()) {
    return NextResponse.json({ error: "live_rooms_disabled" }, { status: 503 });
  }
  const body: unknown = await request.json().catch(() => null);
  const candidate = body as {
    sessionId?: unknown;
    remainingSeconds?: unknown;
    sessionPayload?: unknown;
  } | null;
  if (
    !candidate ||
    typeof candidate.sessionId !== "string" ||
    typeof candidate.remainingSeconds !== "number" ||
    typeof candidate.sessionPayload !== "string"
  ) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await createRoom(
        candidate.sessionId,
        candidate.remainingSeconds,
        candidate.sessionPayload,
      ),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "RoomStoreConfigurationError") {
      return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });
    }
    throw error;
  }
}

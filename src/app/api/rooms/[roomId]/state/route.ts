import { NextResponse } from "next/server";
import { publicRoomState, type RoomStatePatch } from "@/lib/realtime/room-types";
import { roomStore } from "@/lib/realtime/room-store";
import { updateRoom } from "@/lib/realtime/room-service";
import { liveRoomsEnabled } from "@/lib/realtime/live-rooms-config";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  if (!liveRoomsEnabled()) {
    return NextResponse.json({ error: "live_rooms_disabled" }, { status: 503 });
  }
  const { roomId } = await context.params;
  let room;
  try {
    room = await roomStore().get(roomId);
  } catch (error) {
    if (error instanceof Error && error.name === "RoomStoreConfigurationError") {
      return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });
    }
    throw error;
  }
  return room
    ? NextResponse.json(publicRoomState(room))
    : NextResponse.json({ error: "room_not_found" }, { status: 404 });
}

export async function POST(request: Request, context: RouteContext) {
  if (!liveRoomsEnabled()) {
    return NextResponse.json({ error: "live_rooms_disabled" }, { status: 503 });
  }
  const { roomId } = await context.params;
  const authorization = request.headers.get("authorization");
  const hostToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!hostToken) {
    return NextResponse.json({ error: "host_token_required" }, { status: 401 });
  }
  const patch = (await request.json().catch(() => null)) as RoomStatePatch | null;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  let updated;
  try {
    updated = await updateRoom(roomId, hostToken, patch);
  } catch (error) {
    if (error instanceof Error && error.name === "RoomStoreConfigurationError") {
      return NextResponse.json({ error: "redis_not_configured" }, { status: 503 });
    }
    throw error;
  }
  if (updated === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!updated) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }
  return NextResponse.json(publicRoomState(updated));
}

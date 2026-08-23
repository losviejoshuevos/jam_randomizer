import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/rooms/[roomId]/events/route";
import { createRoom, updateRoom } from "@/lib/realtime/room-service";
import { resetRoomStoreForTests } from "@/lib/realtime/room-store";

describe("room event stream", () => {
  beforeEach(() => {
    delete process.env.LIVE_ROOMS_ENABLED;
    delete process.env.NEXT_PUBLIC_LIVE_ROOMS_ENABLED;
    resetRoomStoreForTests();
  });

  afterEach(() => resetRoomStoreForTests());

  it("pushes the initial and updated room state", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    const abortController = new AbortController();
    const response = await GET(
      new Request("http://localhost/events", {
        signal: abortController.signal,
      }),
      { params: Promise.resolve({ roomId: created.room.roomId }) },
    );
    const reader = response.body?.getReader();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    const initial = decoder.decode((await reader!.read()).value);
    expect(initial).toContain("event: state");
    expect(initial).toContain('"phase":"idle"');

    await updateRoom(created.room.roomId, created.hostToken, {
      phase: "playing",
    });
    const updated = decoder.decode((await reader!.read()).value);
    expect(updated).toContain("event: state");
    expect(updated).toContain('"phase":"playing"');

    abortController.abort();
    await reader!.cancel();
  });
});

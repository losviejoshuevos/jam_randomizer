import { beforeEach, describe, expect, it } from "vitest";
import { createRoom, updateRoom } from "@/lib/realtime/room-service";
import { resetRoomStoreForTests, roomStore } from "@/lib/realtime/room-store";

describe("temporary room service", () => {
  beforeEach(() => resetRoomStoreForTests());

  it("creates a private host capability and exposes only public state", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    expect(created.storage).toBe("memory");
    expect(created.hostToken.length).toBe(32);
    expect(created.room).toMatchObject({ phase: "idle", stepIndex: 0 });
    expect(created.room).not.toHaveProperty("hostTokenHash");
    expect(await roomStore().get(created.room.roomId)).toHaveProperty("hostTokenHash");
  });

  it("allows the host to publish state and rejects another token", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    expect(
      await updateRoom(created.room.roomId, "wrong", { phase: "playing" }),
    ).toBe("forbidden");
    const updated = await updateRoom(created.room.roomId, created.hostToken, {
      phase: "playing",
      stepIndex: 2,
      remainingSeconds: 42,
      beatIndex: 3,
      squareBeat: 7,
      startLeadMs: 1_500,
    });
    expect(updated).toMatchObject({
      phase: "playing",
      stepIndex: 2,
      remainingSeconds: 42,
      beatIndex: 3,
      squareBeat: 7,
      revision: 2,
    });
    expect(updated && updated !== "forbidden" ? updated.beatAnchorAt : null).not.toBeNull();
    if (updated && updated !== "forbidden" && updated.beatAnchorAt) {
      expect(Date.parse(updated.beatAnchorAt) - Date.parse(updated.updatedAt)).toBe(1_500);
    }
  });

  it("keeps musicians in the room and replaces the session payload", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    const waiting = await updateRoom(created.room.roomId, created.hostToken, {
      phase: "waiting",
    });
    expect(waiting).toMatchObject({ phase: "waiting", sessionPayload: "payload-one" });

    const next = await updateRoom(created.room.roomId, created.hostToken, {
      sessionId: "session-two",
      sessionPayload: "payload-two",
      phase: "idle",
      stepIndex: 0,
      remainingSeconds: 90,
    });
    expect(next).toMatchObject({
      sessionId: "session-two",
      sessionPayload: "payload-two",
      phase: "idle",
      remainingSeconds: 90,
    });
  });

  it("accepts the host beat timestamp for a section handoff", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    const anchorAtMs = Date.now() - 120;
    const updated = await updateRoom(created.room.roomId, created.hostToken, {
      phase: "playing",
      stepIndex: 1,
      remainingSeconds: 90,
      beatIndex: 0,
      squareBeat: 0,
      beatAnchorAtMs: anchorAtMs,
    });

    expect(
      updated && updated !== "forbidden" && updated.beatAnchorAt
        ? Date.parse(updated.beatAnchorAt)
        : null,
    ).toBe(anchorAtMs);
  });

  it("pushes room changes to subscribers without polling", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    const received: Array<string | null> = [];
    const store = roomStore();
    const unsubscribe = store.subscribe(created.room.roomId, (room) => {
      received.push(room?.phase ?? null);
    });

    await updateRoom(created.room.roomId, created.hostToken, {
      phase: "playing",
    });
    await store.delete(created.room.roomId);
    unsubscribe();

    expect(received).toEqual(["playing", null]);
  });

  it("shortens a terminated room lifetime", async () => {
    const created = await createRoom("session-one", 120, "payload-one");
    const terminated = await updateRoom(created.room.roomId, created.hostToken, {
      phase: "terminated",
    });
    expect(terminated && terminated !== "forbidden"
      ? Date.parse(terminated.expiresAt) - Date.parse(terminated.updatedAt)
      : 0).toBe(60_000);
  });
});

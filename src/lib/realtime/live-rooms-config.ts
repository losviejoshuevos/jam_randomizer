export function liveRoomsEnabled(): boolean {
  return (
    process.env.LIVE_ROOMS_ENABLED !== "false" &&
    process.env.NEXT_PUBLIC_LIVE_ROOMS_ENABLED !== "false"
  );
}

"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { JamSession } from "@/lib/music/domain/types";
import { createLiveRoom } from "@/lib/realtime/room-client";
import type { CreatedRoom } from "@/lib/realtime/room-types";
import { saveActiveHostRoom } from "@/lib/realtime/active-host-room";
import { liveRoomsEnabled } from "@/lib/realtime/live-rooms-config";
import { createSessionUrl, encodeSessionPayload } from "@/lib/sharing/session-payload";

interface LiveRoomPanelProps {
  session: JamSession;
  onCreated: (room: CreatedRoom) => void;
}

export function LiveRoomPanel({ session, onCreated }: LiveRoomPanelProps) {
  const enabled = liveRoomsEnabled();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreatedRoom | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [guestUrl, setGuestUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guestUrl) return;
    let cancelled = false;
    void QRCode.toDataURL(guestUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
    }).then((url) => {
      if (!cancelled) setQr(url);
    }).catch(() => {
      if (!cancelled) setError("Сессия слишком велика для QR. Скопируйте ссылку.");
    });
    return () => {
      cancelled = true;
    };
  }, [guestUrl]);

  async function startRoom() {
    if (!enabled) {
      setOpen(true);
      setError("Ведомые экраны временно отключены. Мастерский Stage Mode продолжает работать.");
      return;
    }
    setOpen(true);
    if (created || busy) return;
    setBusy(true);
    setError(null);
    try {
      const room = await createLiveRoom(
        session.id,
        session.timeline[0]?.durationSeconds ?? 0,
        encodeSessionPayload(session),
      );
      setCreated(room);
      saveActiveHostRoom(room);
      setGuestUrl(
        createSessionUrl(session, window.location.origin, {
          roomId: room.room.roomId,
          guest: true,
        }),
      );
      sessionStorage.setItem(
        `jam-room-host:${room.room.roomId}`,
        room.hostToken,
      );
      onCreated(room);
    } catch {
      setError("Ведомые экраны сейчас недоступны. Мастерский Stage Mode продолжает работать.");
    } finally {
      setBusy(false);
    }
  }

  async function copyGuestLink() {
    if (!guestUrl) return;
    try {
      await navigator.clipboard.writeText(guestUrl);
    } catch {
      setError("Браузер не разрешил скопировать ссылку.");
    }
  }

  return (
    <>
      <button
        aria-label="Подключить других музыкантов"
        className="stage-control-button stage-live-room-button rounded-full border border-[var(--accent-cool)]/40 px-3 py-2 text-sm font-semibold text-[var(--accent-cool)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 sm:px-5 sm:py-3"
        onClick={() => void startRoom()}
        title={enabled ? undefined : "Ведомые экраны временно отключены"}
        type="button"
      >
        <span className="stage-live-room-label-compact leading-tight sm:hidden">Другие музыканты</span>
        <span className="stage-live-room-label-full hidden sm:inline">Подключить других музыкантов</span>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Подключение ведомых экранов">
          <div className="max-h-[96dvh] w-full max-w-5xl overflow-auto rounded-3xl border border-white/15 bg-[#161613] p-5 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Живая комната</p>
                <h2 className="mt-2 text-3xl font-black">Подключите музыкантов</h2>
              </div>
              <button className="rounded-full border border-white/15 px-3 py-2 transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95" onClick={() => setOpen(false)} type="button">Закрыть</button>
            </div>
            {busy ? <p className="mt-8 text-neutral-400">Создаю временную комнату…</p> : null}
            {error ? <p className="mt-6 rounded-xl bg-red-950/50 p-3 text-red-200">{error}</p> : null}
            {created ? (
              <div className="mt-6">
                <div className="grid gap-6 md:grid-cols-[minmax(360px,520px)_1fr] md:items-center">
                {qr ? (
                  // Generated locally from the guest URL.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="QR-код живой комнаты" className="w-full rounded-2xl bg-white p-3" src={qr} />
                ) : <div className="aspect-square rounded-2xl bg-white/5" />}
                <div>
                  <p className="text-lg font-black text-white">Наведите камеру телефона на QR</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">
                    Ведомые экраны получают текущую тему и переходы. Звук метронома остаётся только у ведущего.
                  </p>
                  <p className="mt-3 text-xs text-neutral-500">
                    Хранилище: {created.storage === "upstash" ? "Upstash Redis" : "память локального сервера"}. Комната продлевается при активности и живёт до 12 часов.
                  </p>
                  <button className="mt-5 rounded-full bg-[var(--accent)] px-5 py-3 font-bold text-black transition hover:brightness-110 active:scale-95" onClick={() => void copyGuestLink()} type="button">Скопировать гостевую ссылку</button>
                  <a className="mt-3 block text-sm font-bold text-[var(--accent-cool)] underline underline-offset-4 transition hover:text-white active:opacity-70" href={guestUrl ?? undefined} target="_blank" rel="noreferrer">
                    Открыть ведомый экран для проверки
                  </a>
                </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

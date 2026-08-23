"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { JamSession } from "@/lib/music/domain/types";
import {
  parseSessionFile,
  serializeSessionFile,
  sessionFileName,
} from "@/lib/sharing/session-file";
import { createSessionUrl } from "@/lib/sharing/session-payload";

interface SessionSharingPanelProps {
  session: JamSession;
  onImport: (session: JamSession) => void;
}

type Feedback = { tone: "ok" | "error"; text: string } | null;

export function SessionSharingPanel({ session, onImport }: SessionSharingPanelProps) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function shareUrl() {
    return createSessionUrl(session, window.location.origin);
  }

  useEffect(() => {
    if (!showQr) return;
    let cancelled = false;
    void QRCode.toDataURL(
      createSessionUrl(session, window.location.origin),
      {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
      },
    )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setFeedback({
            tone: "error",
            text: "Сессия слишком велика для QR. Используйте ссылку или файл.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session, showQr]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setFeedback({ tone: "ok", text: "Ссылка скопирована." });
    } catch {
      setFeedback({ tone: "error", text: "Браузер не разрешил скопировать ссылку." });
    }
  }

  async function systemShare() {
    const url = shareUrl();
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: session.title,
        text: `${session.title} · ${session.bpm} BPM · ${session.meter}`,
        url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback({ tone: "error", text: "Не удалось открыть системное меню." });
    }
  }

  function telegramShare() {
    const target = new URL("https://t.me/share/url");
    target.searchParams.set("url", shareUrl());
    target.searchParams.set("text", `${session.title} · ${session.bpm} BPM`);
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function downloadFile() {
    const blob = new Blob([serializeSessionFile(session)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sessionFileName(session);
    link.click();
    URL.revokeObjectURL(url);
    setFeedback({ tone: "ok", text: "Файл сессии сохранён." });
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      onImport(parseSessionFile(await file.text()));
      setFeedback({ tone: "ok", text: "Сессия открыта из файла." });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: error instanceof Error ? error.message : "Не удалось открыть файл.",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const buttonClass =
    "rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <section className="history-panel mt-8 rounded-3xl border border-white/10 p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Сохранить и поделиться</p>
        <h2 className="mt-2 text-2xl font-black">Эта сессия помещается в ссылку</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Ссылка и файл содержат аккорды, форму и настройки целиком. Для их открытия база данных не нужна.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={buttonClass} onClick={copyLink} type="button">Скопировать ссылку</button>
        <button className={buttonClass} onClick={systemShare} type="button">Поделиться</button>
        <button className={buttonClass} onClick={telegramShare} type="button">Telegram</button>
        <button className={buttonClass} onClick={() => setShowQr((value) => !value)} type="button">QR-код</button>
        <button className={buttonClass} onClick={downloadFile} type="button">Сохранить файл</button>
        <button className={buttonClass} onClick={() => inputRef.current?.click()} type="button">Открыть файл</button>
        <input
          accept=".json,.jam.json,application/json"
          className="sr-only"
          onChange={(event) => void importFile(event.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
      </div>
      {feedback ? (
        <p className={`mt-4 text-sm ${feedback.tone === "error" ? "text-red-300" : "text-[var(--accent)]"}`}>
          {feedback.text}
        </p>
      ) : null}
      {showQr ? (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center">
          {qrDataUrl ? (
            // Generated from the current session; no remote image host is involved.
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="QR-код сессии" className="h-48 w-48 rounded-xl bg-white p-2" src={qrDataUrl} />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-white/5 text-sm text-neutral-500">Создаю QR…</div>
          )}
          <p className="max-w-md text-sm leading-6 text-neutral-400">
            Это статичная переносимая сессия. Для автоматической смены тем на других устройствах создайте живую комнату в Stage Mode.
          </p>
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  function shareUrl() {
    return createSessionUrl(session, window.location.origin);
  }

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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Сохранить или отправить</p>
        <h2 className="mt-2 text-2xl font-black">Сохраните удачный джем</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
          Ссылка и файл содержат аккорды, форму и настройки целиком. Для их открытия база данных не нужна.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={buttonClass} onClick={copyLink} type="button">Скопировать ссылку</button>
        <button className={buttonClass} onClick={systemShare} type="button">Отправить сессию</button>
        <button className={buttonClass} onClick={telegramShare} type="button">Отправить в Telegram</button>
        <button className={buttonClass} onClick={downloadFile} type="button">Сохранить себе</button>
        <button className={buttonClass} onClick={() => inputRef.current?.click()} type="button">Открыть сохранённую</button>
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
    </section>
  );
}

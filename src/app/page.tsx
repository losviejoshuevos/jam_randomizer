import { RouteLink } from "@/components/ui/route-link";

export default function EditorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
        Foundation
      </p>
      <div className="max-w-3xl space-y-5">
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          Jam Randomizer
        </h1>
        <p className="text-lg leading-8 text-[var(--muted)] sm:text-xl">
          Редактор джем-сессии появится в одной из следующих итераций. Основа проекта,
          доменная модель A → B → A и контракты Music Engine уже разделены по слоям.
        </p>
      </div>
      <div>
        <RouteLink href="/stage">Открыть Stage Mode</RouteLink>
      </div>
    </main>
  );
}

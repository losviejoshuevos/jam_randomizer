import { RouteLink } from "@/components/ui/route-link";

export default function StagePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
        Stage Mode
      </p>
      <h1 className="text-6xl font-black sm:text-8xl">A → B → A</h1>
      <p className="max-w-2xl text-xl text-neutral-400">
        Полноэкранная карточка, таймер и предупреждение о переходе будут добавлены
        отдельной согласованной итерацией.
      </p>
      <RouteLink href="/">Вернуться в редактор</RouteLink>
    </main>
  );
}

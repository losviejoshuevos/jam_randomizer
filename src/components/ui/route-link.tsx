import Link from "next/link";

interface RouteLinkProps {
  href: string;
  children: string;
}

export function RouteLink({ href, children }: RouteLinkProps) {
  return (
    <Link
      className="inline-flex rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-90"
      href={href}
    >
      {children}
    </Link>
  );
}

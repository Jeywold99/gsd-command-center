"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/pipeline", label: "Today" },
  { href: "/pipeline/board", label: "Board" },
  { href: "/pipeline/applications", label: "List" },
];

// Today / Board / List switcher shown on the three top-level Pipeline pages (not on an application's page).
export default function SubNav() {
  const pathname = usePathname();
  if (!TABS.some((t) => t.href === pathname)) return null;
  return (
    <nav aria-label="Pipeline" className="flex w-fit gap-1 rounded-full border border-black/[0.07] bg-white p-1">
      {TABS.map((t) => {
        const active = t.href === pathname;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-5 text-sm font-bold transition ${
              active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Building2, FolderLock, FileBarChart } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Overview", short: "Month", icon: CalendarDays },
  { href: "/b", label: "Businesses", short: "Businesses", icon: Building2 },
  { href: "/vault", label: "Vault", short: "Vault", icon: FolderLock },
  { href: "/reports", label: "Monthly reports", short: "Reports", icon: FileBarChart },
];

// The browser shows /vault on the portal host; strip the internal
// /portal/<slug> prefix in case it ever appears.
function usePortalPath() {
  const p = usePathname() || "/";
  return p.replace(/^\/portal\/[^/]+/, "") || "/";
}

function isActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/t/") || path === "/new";
  return path === href || path.startsWith(`${href}/`);
}

export function PortalNav() {
  const path = usePortalPath();
  return (
    <nav className="hidden md:flex items-center gap-1 h-full">
      {ITEMS.map((i) => {
        const on = isActive(path, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`h-full flex items-center px-3 text-[14px] font-semibold no-underline border-b-[3px] ${
              on ? "border-[var(--p-ink)] text-[var(--p-ink)]" : "border-transparent text-[var(--p-muted)] hover:text-[var(--p-ink)]"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalTabBar() {
  const path = usePortalPath();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-[var(--p-line)] pb-safe">
      <div className="grid grid-cols-4">
        {ITEMS.map((i) => {
          const on = isActive(path, i.href);
          const Icon = i.icon;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex flex-col items-center justify-center gap-0.5 h-[60px] text-[12px] font-semibold no-underline ${
                on ? "text-[var(--p-ink)]" : "text-[var(--p-faint)]"
              }`}
            >
              <Icon size={20} strokeWidth={on ? 2.4 : 2} aria-hidden />
              {i.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

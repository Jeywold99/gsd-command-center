"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  ListChecks,
  Inbox,
  CalendarDays,
  MessageSquare,
  FolderArchive,
  KeyRound,
  Timer,
  CalendarClock,
  Settings,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import NotificationBell from "./notification-bell";
import ClockInButton from "./clock-in-button";
import SavedToast from "./saved-toast";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { section: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    section: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/crm", label: "CRM", icon: Building2 },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    section: "Collaborate",
    items: [
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/chat", label: "Chat", icon: MessageSquare },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/vault", label: "Document Vault", icon: FolderArchive },
      { href: "/passwords", label: "Password Vault", icon: KeyRound },
      { href: "/time", label: "Time Tracker", icon: Timer },
      { href: "/timesheet", label: "Timesheet", icon: CalendarClock },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  ...Object.fromEntries(
    NAV.flatMap((g) => g.items).map((i) => [i.href, i.label]),
  ),
  "/settings": "Settings",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Hoisted out of AppShell so it is a stable component identity across renders
// (a component defined inside another remounts its subtree on every render).
function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand/15 text-white border-l-2 border-brand"
          : "text-white/55 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
      }`}
    >
      <Icon
        className={`w-[18px] h-[18px] shrink-0 ${active ? "text-brand" : "text-white/50 group-hover:text-white/80"}`}
      />
      {item.label}
    </Link>
  );
}

export default function AppShell({
  user,
  notifications,
  unreadCount,
  running,
  children,
}: {
  user: { name: string; email: string; role: string };
  notifications: Notification[];
  unreadCount: number;
  running: { startedAt: string | Date } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const canSeeSettings = user.role === "OWNER" || user.role === "MANAGER";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const title = TITLES[pathname] ?? "GSD HQ";

  const closeMobile = () => setMobileOpen(false);

  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-16 shrink-0 border-b border-white/10">
        <span className="font-display text-3xl leading-none tracking-wide text-brand">
          GSD
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 leading-tight">
          Command
          <br />
          Center
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
              {group.section}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  onNavigate={closeMobile}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings + footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        {canSeeSettings && (
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: Settings }}
            active={isActive("/settings")}
            onNavigate={closeMobile}
          />
        )}
        <p className="px-3 pt-2 text-[10px] text-white/25">GSD HQ · v0.1</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-cream font-body">
      <SavedToast />
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-midnight text-white fixed inset-y-0 left-0 z-30">
        {SidebarInner}
      </aside>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-midnight text-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {SidebarInner}
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-black/[0.07] flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-ink/70 hover:text-ink"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl tracking-wide text-ink">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <ClockInButton running={running} />

            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />

            <div className="h-6 w-px bg-black/10" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-midnight text-white text-xs font-bold flex items-center justify-center">
                {initials(user.name)}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">
                  {user.role}
                </p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="ml-1 p-2 rounded-full text-ink/50 hover:text-ink hover:bg-black/[0.04] transition"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

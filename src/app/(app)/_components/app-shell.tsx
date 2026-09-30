"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  House,
  ListChecks,
  CalendarDays,
  Mic,
  Lightbulb,
  Building2,
  FolderKanban,
  Inbox,
  MessageSquare,
  FolderArchive,
  KeyRound,
  Timer,
  CalendarClock,
  Settings,
  LayoutGrid,
  Plus,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import NotificationBell from "./notification-bell";
import ClockInButton from "./clock-in-button";
import GlobalSearch from "./global-search";
import SavedToast from "./saved-toast";
import CreateSheet from "./create-sheet";
import InstallHint from "./install-hint";
import Avatar from "./avatar";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { section: string | null; items: NavItem[] };

// Big page titles for top-level routes. Detail pages (e.g. /projects/[id])
// aren't listed and render their own heading.
const TITLES: Record<string, string> = {
  "/": "Today",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/voice": "Voice",
  "/ideas": "Ideas",
  "/crm": "CRM",
  "/projects": "Projects",
  "/inbox": "Inbox",
  "/chat": "Chat",
  "/vault": "Documents",
  "/passwords": "Passwords",
  "/time": "Time",
  "/timesheet": "Timesheet",
  "/settings": "Settings",
  "/profile": "Profile",
  "/more": "More",
};

// Mobile tab-bar destinations; every other top-level page lives under More and
// gets a "‹ More" back link on phones.
const TAB_ROOTS = ["/", "/tasks", "/calendar", "/more"];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function greeting(d: Date) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// ── Desktop sidebar ──────────────────────────────────────────────────────────

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex h-[38px] items-center gap-3 rounded-[11px] px-3 text-sm transition-colors ${
        active
          ? "bg-brand/[0.16] text-white font-semibold"
          : "text-white/[0.68] font-medium hover:text-white hover:bg-white/[0.05]"
      }`}
    >
      <Icon
        className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#FF7A33]" : "text-white/55 group-hover:text-white/80"}`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {!!item.badge && (
        <span className="rounded-[7px] bg-brand px-[7px] py-[2px] text-[11px] font-bold text-ink">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

// ── Mobile tab bar ───────────────────────────────────────────────────────────

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full flex-col items-center justify-center gap-[3px] text-[11px] font-semibold ${
        active ? "text-[#FF7A33]" : "text-white/[0.62]"
      }`}
    >
      <Icon className="w-[22px] h-[22px]" strokeWidth={2} />
      <span>{label}</span>
      <span className={`h-1 w-1 rounded-full ${active ? "bg-[#FF7A33]" : "bg-transparent"}`} />
    </Link>
  );
}

export default function AppShell({
  user,
  notifications,
  unreadCount,
  voiceUnread,
  running,
  children,
}: {
  user: { name: string; email: string; role: string; avatarUrl: string | null };
  notifications: Notification[];
  unreadCount: number;
  voiceUnread: number;
  running: { startedAt: string | Date } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const canSeeSettings = user.role === "OWNER" || user.role === "MANAGER";

  // Date/greeting are computed on the client so they use the viewer's clock.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock, avoids hydration mismatch
    setNow(new Date());
  }, []);

  const nav: NavGroup[] = [
    { section: null, items: [{ href: "/", label: "Home", icon: House }] },
    {
      section: "My work",
      items: [
        { href: "/tasks", label: "Tasks", icon: ListChecks },
        { href: "/calendar", label: "Calendar", icon: CalendarDays },
      ],
    },
    {
      section: "Capture",
      items: [
        { href: "/voice", label: "Voice notes", icon: Mic, badge: voiceUnread },
        { href: "/ideas", label: "Ideas", icon: Lightbulb },
      ],
    },
    {
      section: "Clients & team",
      items: [
        { href: "/crm", label: "CRM", icon: Building2 },
        { href: "/projects", label: "Projects", icon: FolderKanban },
        { href: "/inbox", label: "Shared inbox", icon: Inbox },
        { href: "/chat", label: "Chat", icon: MessageSquare },
      ],
    },
    {
      section: "Operations",
      items: [
        { href: "/vault", label: "Documents", icon: FolderArchive },
        { href: "/passwords", label: "Passwords", icon: KeyRound },
        { href: "/time", label: "Time tracker", icon: Timer },
        { href: "/timesheet", label: "Timesheet", icon: CalendarClock },
        ...(canSeeSettings ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
      ],
    },
  ];

  // Split-view sections keep their title on desktop for detail routes too
  // (phones show the detail full-screen with its own back link).
  const splitTitle = pathname.startsWith("/voice/") ? "Voice" : undefined;
  const title = TITLES[pathname] ?? splitTitle;
  // An open inbox thread / chat room is a full phone screen with its own back link.
  const openDetail =
    (pathname === "/inbox" && searchParams.has("thread")) || (pathname === "/chat" && searchParams.has("channel"));
  const titleDesktopOnly = (!TITLES[pathname] && !!splitTitle) || openDetail;
  const isTabRoot = TAB_ROOTS.includes(pathname);
  const moreActive = !["/", "/tasks", "/calendar"].some((h) => isActivePath(pathname, h));

  return (
    <div className="flex min-h-screen bg-cream font-body text-ink">
      <SavedToast />

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col gap-[18px] bg-midnight px-3.5 pt-[22px] pb-4 text-white">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-brand font-display text-xl tracking-wide text-ink">
            GSD
          </span>
          <span className="flex flex-col">
            <span className="font-display text-2xl leading-none tracking-wide">GSD HQ</span>
            <span className="text-[11px] font-medium text-white/60">Command Center</span>
          </span>
        </Link>

        <nav aria-label="Main" className="-mx-1 flex flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {nav.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {group.section && (
                <p className="mx-3 mt-3 mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => (
                <SideLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
              ))}
            </div>
          ))}
        </nav>

        <Link
          href="/profile"
          className={`flex items-center gap-2.5 rounded-[14px] p-2.5 transition-colors ${
            isActivePath(pathname, "/profile") ? "bg-brand/[0.16]" : "bg-white/[0.06] hover:bg-white/[0.1]"
          }`}
        >
          <Avatar name={user.name} src={user.avatarUrl} className="w-[34px] h-[34px] text-sm" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="text-xs text-white/60">
              <span className="capitalize">{user.role.toLowerCase()}</span> · Profile
            </span>
          </span>
        </Link>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[248px]">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-[72px] shrink-0 items-center gap-4 border-b border-black/[0.07] bg-cream/85 px-9 backdrop-blur-md lg:flex">
          <GlobalSearch />
          <div className="flex-1" />
          <ClockInButton running={running} />
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        </header>

        <main className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-tabbar sm:px-5 lg:px-9 lg:pt-7 lg:pb-10">
          {title && (
            <div className={`mb-5 lg:mb-6 ${titleDesktopOnly ? "hidden lg:block" : ""}`}>
              {/* Phones: back link for pages that live under More */}
              {!isTabRoot && (
                <Link
                  href="/more"
                  className="lg:hidden -ml-1 mt-2 inline-flex min-h-11 items-center gap-0.5 text-[15px] font-semibold text-[#B34100]"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
                  More
                </Link>
              )}
              <div
                className={`flex items-end justify-between gap-3 ${isTabRoot ? "pt-2 lg:pt-0" : ""}`}
              >
                <div className="min-w-0">
                  {pathname === "/" && (
                    <p className="mb-1 text-[13px] font-medium text-[#6B645D] lg:text-sm" suppressHydrationWarning>
                      {now
                        ? `${now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${greeting(now)}, ${user.name.split(" ")[0]}`
                        : " "}
                    </p>
                  )}
                  <h1 className="font-display text-[56px] leading-[0.9] tracking-[0.01em] lg:text-[72px]">
                    {title}
                    <span className="text-brand">.</span>
                  </h1>
                </div>
                {/* Phones: search + bell sit beside the big title (desktop has the top bar) */}
                <div className="flex shrink-0 gap-2 pb-1 lg:hidden">
                  <GlobalSearch />
                  <NotificationBell notifications={notifications} unreadCount={unreadCount} />
                </div>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* ── Mobile tab bar ── */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed inset-x-3.5 bottom-tabbar z-40 grid h-16 grid-cols-5 items-center rounded-3xl bg-midnight shadow-[0_14px_34px_rgba(30,30,46,0.30)]"
      >
        <Tab href="/" label="Home" icon={House} active={pathname === "/"} />
        <Tab href="/tasks" label="Tasks" icon={ListChecks} active={isActivePath(pathname, "/tasks")} />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Create"
          aria-haspopup="dialog"
          className="-mt-[30px] flex h-[58px] w-[58px] items-center justify-center justify-self-center rounded-[20px] border-4 border-cream bg-brand text-ink shadow-[0_10px_22px_rgba(255,92,0,0.40)] active:scale-95 transition-transform"
        >
          <Plus className="w-[26px] h-[26px]" strokeWidth={2.6} />
        </button>
        <Tab href="/calendar" label="Calendar" icon={CalendarDays} active={isActivePath(pathname, "/calendar")} />
        <Tab href="/more" label="More" icon={LayoutGrid} active={moreActive} />
      </nav>

      <InstallHint />
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

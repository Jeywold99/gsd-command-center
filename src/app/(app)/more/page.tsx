import Link from "next/link";
import {
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
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { countUnreadVoiceNotes } from "@/lib/voice-notes";
import Avatar from "../_components/avatar";

// The phone "More" tab: everything that isn't Home / Tasks / Calendar.

function Section({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#6B645D]">{children}</h2>
  );
}

function Row({ href, label, icon: Icon, last }: { href: string; label: string; icon: LucideIcon; last?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-[54px] items-center gap-3.5 ${last ? "" : "border-b border-black/[0.06]"}`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-[15px] font-semibold">{label}</span>
      <ChevronRight className="w-4 h-4 text-[#6B645D]" />
    </Link>
  );
}

function Tile({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-2.5 rounded-[18px] border border-black/[0.07] bg-white px-3.5 text-sm font-semibold hover:border-brand/40"
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </Link>
  );
}

export default async function MorePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const voiceUnread = await countUnreadVoiceNotes(user.id);
  const canSeeSettings = user.role === "OWNER" || user.role === "MANAGER";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        href="/profile"
        className="flex items-center gap-3 rounded-[22px] border border-black/[0.07] bg-white px-4 py-3.5 hover:border-brand/40"
      >
        <Avatar name={user.name} src={user.avatarUrl} className="w-12 h-12 text-[22px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{user.name}</span>
          <span className="block text-[13px] text-[#6B645D]">
            <span className="capitalize">{user.role.toLowerCase()}</span> · Profile, photo, voice key
          </span>
        </span>
        <ChevronRight className="w-[18px] h-[18px] text-[#6B645D]" />
      </Link>

      <Section>Capture</Section>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/voice"
          className="flex min-h-28 flex-col justify-between rounded-[22px] bg-midnight p-4 text-white"
        >
          <span className="flex items-center justify-between">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-brand text-ink">
              <Mic className="w-5 h-5" />
            </span>
            {voiceUnread > 0 && (
              <span className="rounded-lg bg-white/[0.14] px-2 py-1 text-xs font-bold">{voiceUnread} new</span>
            )}
          </span>
          <span className="text-base font-bold">Voice notes</span>
        </Link>
        <Link
          href="/ideas"
          className="flex min-h-28 flex-col justify-between rounded-[22px] border border-black/[0.07] bg-white p-4"
        >
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-brand-pale text-[#B34100]">
            <Lightbulb className="w-5 h-5" />
          </span>
          <span className="text-base font-bold">Ideas</span>
        </Link>
      </div>

      <Section>Clients &amp; team</Section>
      <nav aria-label="Clients and team" className="rounded-[22px] border border-black/[0.07] bg-white px-4">
        <Row href="/crm" label="CRM" icon={Building2} />
        <Row href="/projects" label="Projects" icon={FolderKanban} />
        <Row href="/inbox" label="Shared inbox" icon={Inbox} />
        <Row href="/chat" label="Chat" icon={MessageSquare} last />
      </nav>

      <Section>Operations</Section>
      <nav aria-label="Operations" className="grid grid-cols-2 gap-2.5">
        <Tile href="/vault" label="Documents" icon={FolderArchive} />
        <Tile href="/passwords" label="Passwords" icon={KeyRound} />
        <Tile href="/time" label="Time tracker" icon={Timer} />
        <Tile href="/timesheet" label="Timesheet" icon={CalendarClock} />
        {canSeeSettings && <Tile href="/settings" label="Team settings" icon={Settings} />}
      </nav>
    </div>
  );
}

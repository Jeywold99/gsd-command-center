import {
  ArrowRightLeft,
  CalendarCheck,
  CheckCircle2,
  MailOpen,
  RefreshCw,
  Send,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import { ago, fmtDayTime } from "@/lib/pipeline/format";
import { STATUS_LABEL, type EventRow, type Status } from "@/lib/pipeline/types";

const ICON: Record<string, LucideIcon> = {
  created: Sparkles,
  status_changed: ArrowRightLeft,
  email_received: MailOpen,
  email_sent: Send,
  follow_up_sent: RefreshCw,
  interview_scheduled: CalendarCheck,
  note: StickyNote,
  requirement_completed: CheckCircle2,
};

const WHO: Record<string, string> = { eldwin: "Eldwin", jana: "Jana", n8n: "Automation", system: "System" };

const status = (s: Status | null) => (s ? STATUS_LABEL[s] : "—");

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// The application's history, newest first. Server component (read only).
export default function Timeline({ events }: { events: EventRow[] }) {
  if (events.length === 0) return <p className="text-sm text-[#6B645D]">No history yet.</p>;
  return (
    <ol className="space-y-0">
      {events.map((e, i) => {
        const Icon = ICON[e.type] ?? StickyNote;
        const payload = e.payload ?? {};
        let title = e.summary ?? e.type.replace(/_/g, " ");
        let detail: string | null = null;

        if (e.type === "status_changed") {
          title = `${status(e.from_status)} → ${status(e.to_status)}`;
          // Keep the explanation when the system wrote one ("Auto-updated from email…", "No activity for 21 days…").
          if (e.summary && !/^Status changed from /i.test(e.summary)) detail = e.summary;
        } else if (e.type === "email_received") {
          const subject = str(payload.subject);
          const from = str(payload.from);
          detail = [subject, from].filter(Boolean).join(" · ") || null;
        }

        return (
          <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < events.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-black/10" aria-hidden />}
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-[#B34100]">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="break-words text-sm font-bold leading-snug text-ink">{title}</p>
              {detail && <p className="mt-0.5 break-words text-[13px] leading-snug text-[#6B645D]">{detail}</p>}
              <p className="mt-0.5 text-xs text-[#6B645D]" title={fmtDayTime(e.occurred_at)}>
                {WHO[e.created_by] ?? e.created_by} · {ago(e.occurred_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

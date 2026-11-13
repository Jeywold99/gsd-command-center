import Link from "next/link";
import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses, loadClientTasks, purgeOldTrash, TRASH_DAYS } from "@/lib/portal/data";
import { fmtDayTz } from "@/lib/portal/shared";
import { BizTag } from "../_components/ui";
import { taskQuickAction } from "../actions";

// Request-time "now" (a server component; computed per request on purpose).
function nowMs() {
  return Date.now();
}

export default async function TrashPage({ params }: PageProps<"/portal/[slug]/trash">) {
  const { slug } = await params;
  const ctx = await getPortalContext(slug);
  await purgeOldTrash(ctx.client.id);
  const [businesses, all] = await Promise.all([listBusinesses(ctx.client.id), loadClientTasks(ctx.client.id)]);
  const deleted = all.filter((t) => t.deletedAt).sort((a, b) => b.deletedAt!.getTime() - a.deletedAt!.getTime());
  const bizById = new Map(businesses.map((b) => [b.id, b]));

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      <div>
        <h1 className="p-h1">Deleted tasks</h1>
        <p className="p-muted mt-1">Deleted tasks stay here for {TRASH_DAYS} days, then they&apos;re removed for good.</p>
      </div>
      <section className="p-card overflow-hidden">
        {deleted.length === 0 && <p className="p-4 p-muted">Nothing deleted.</p>}
        {deleted.map((t) => {
          const b = t.projectId ? bizById.get(t.projectId) : undefined;
          const left = Math.max(0, TRASH_DAYS - Math.floor((nowMs() - t.deletedAt!.getTime()) / 86_400_000));
          return (
            <div key={t.id} className="p-row flex-wrap">
              <BizTag short={b?.portalShort} color={b?.portalColor} />
              <Link href={`/t/${t.id}`} className="flex-1 min-w-[160px] font-semibold no-underline hover:underline">
                {t.title}
              </Link>
              <span className="text-[13px] p-faint">
                Deleted {fmtDayTz(t.deletedAt, ctx.client.timezone)} · {left} day{left === 1 ? "" : "s"} left
              </span>
              <form action={taskQuickAction}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="op" value="restore" />
                <button className="p-btn p-btn-sm">Restore</button>
              </form>
            </div>
          );
        })}
      </section>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/time";

function cell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session?.userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "invoice" ? "invoice" : "payroll";
  const userId = url.searchParams.get("user") || session.userId;
  const weekStr = url.searchParams.get("week");
  const weekStart = startOfWeek(weekStr ? new Date(weekStr) : new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

  const entries = await prisma.timeEntry.findMany({
    where: { userId, startedAt: { gte: weekStart, lte: weekEnd }, endedAt: { not: null } },
    orderBy: { startedAt: "asc" },
    include: {
      project: {
        select: {
          name: true,
          client: {
            select: {
              id: true,
              companyName: true,
              billingRates: { orderBy: { effectiveFrom: "desc" }, take: 1 },
            },
          },
        },
      },
    },
  });

  let rows: (string | number)[][];

  if (type === "invoice") {
    const map = new Map<string, { client: string; rate: number; seconds: number }>();
    for (const e of entries) {
      if (!e.billable) continue;
      const c = e.project?.client;
      if (!c) continue;
      const rate = c.billingRates[0] ? Number(c.billingRates[0].rate) : 0;
      const cur = map.get(c.id) ?? { client: c.companyName, rate, seconds: 0 };
      cur.seconds += e.durationSeconds ?? 0;
      cur.rate = rate;
      map.set(c.id, cur);
    }
    rows = [["Client", "Billable Hours", "Rate", "Amount"]];
    for (const v of map.values()) {
      const hrs = v.seconds / 3600;
      rows.push([v.client, hrs.toFixed(2), v.rate.toFixed(2), (hrs * v.rate).toFixed(2)]);
    }
  } else {
    rows = [["Date", "Project", "Client", "Note", "Hours", "Billable"]];
    for (const e of entries) {
      rows.push([
        new Date(e.startedAt).toISOString().slice(0, 10),
        e.project?.name ?? "",
        e.project?.client?.companyName ?? "",
        e.note ?? "",
        ((e.durationSeconds ?? 0) / 3600).toFixed(2),
        e.billable ? "yes" : "no",
      ]);
    }
    const total = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / 3600;
    rows.push(["", "", "", "Total", total.toFixed(2), ""]);
  }

  const csv = rows.map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timesheet-${type}-${weekStart
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}

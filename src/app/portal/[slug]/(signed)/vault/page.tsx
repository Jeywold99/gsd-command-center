import Link from "next/link";
import { getPortalContext } from "@/lib/portal/dal";
import { listAccessLog, listBusinesses, listPortalDocuments, listPortalLogins } from "@/lib/portal/data";
import { dateInputValue, fmtShort, fmtStamp, todayKey } from "@/lib/portal/shared";
import { BizTag, Dot } from "../_components/ui";
import { UploadForm, LoginDetailsForm } from "./forms";
import { deletePortalDocument, deletePortalLogin, openPortalLogin } from "./actions";

const DAY = 86_400_000;

function age(d: Date | null, now: number) {
  if (!d) return { text: "Unknown", old: true };
  const months = Math.floor((now - d.getTime()) / (30 * DAY));
  return { text: months < 1 ? "This month" : `${months} month${months === 1 ? "" : "s"}`, old: months >= 6 };
}

export default async function VaultPage({ params, searchParams }: PageProps<"/portal/[slug]/vault">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const tab = sp.tab === "logins" ? "logins" : "docs";
  const bizFilter = typeof sp.b === "string" ? sp.b : null;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const editLogin = typeof sp.edit === "string" ? sp.edit : null;

  const [businesses, docs, logins, log] = await Promise.all([
    listBusinesses(ctx.client.id),
    listPortalDocuments(ctx.client.id),
    listPortalLogins(ctx.client.id),
    listAccessLog(ctx.client.id),
  ]);
  const bizById = new Map(businesses.map((b) => [b.id, b]));
  const now = new Date(`${todayKey(ctx.client.timezone)}T12:00:00Z`).getTime();

  const matches = (name: string) => !q || name.toLowerCase().includes(q);
  const shownDocs = docs.filter((d) => (!bizFilter || d.projectId === bizFilter) && matches(d.name));
  const shownLogins = logins.filter((l) => (!bizFilter || l.projectId === bizFilter) && matches(l.service));

  const expiring = [
    ...docs
      .filter((d) => d.expiresAt && d.expiresAt.getTime() - now <= 60 * DAY)
      .map((d) => ({ key: d.id, name: d.name, biz: d.projectId, when: d.expiresAt!.getTime() < now ? "expired" : fmtShort(d.expiresAt) })),
    ...logins
      .filter((l) => age(l.lastChangedAt, now).old)
      .map((l) => ({ key: l.id, name: `${l.service} password (over 6 months)`, biz: l.projectId, when: "change now" })),
  ];

  const href = (o: { tab?: string; b?: string | null }) => {
    const p = new URLSearchParams();
    const t = o.tab ?? tab;
    if (t === "logins") p.set("tab", "logins");
    const b = o.b === undefined ? bizFilter : o.b;
    if (b) p.set("b", b);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/vault${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="p-h1">Vault</h1>
          <p className="p-muted mt-1">Every document and login, filed by business. Everything here is open to {ctx.firstName} and the EA team.</p>
        </div>
        <form action="/vault" className="flex gap-2 w-full sm:w-auto">
          {tab === "logins" && <input type="hidden" name="tab" value="logins" />}
          {bizFilter && <input type="hidden" name="b" value={bizFilter} />}
          <input name="q" defaultValue={q} className="p-input sm:w-64" placeholder="Search the Vault" aria-label="Search the Vault" />
          <button className="p-btn">Search</button>
        </form>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr_300px] gap-6 items-start">
        {/* Folders */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          <Link href={href({ b: null })} className={`flex items-center gap-2.5 min-h-10 px-3 rounded-lg font-semibold no-underline whitespace-nowrap ${!bizFilter ? "bg-white border border-[var(--p-line)]" : ""}`}>
            <Dot color="#111827" /> All files <span className="ml-auto p-faint text-[13px] pl-2">{tab === "logins" ? logins.length : docs.length}</span>
          </Link>
          {businesses.map((b) => {
            const n = tab === "logins" ? logins.filter((l) => l.projectId === b.id).length : docs.filter((d) => d.projectId === b.id).length;
            return (
              <Link key={b.id} href={href({ b: b.id })} className={`flex items-center gap-2.5 min-h-10 px-3 rounded-lg font-semibold no-underline whitespace-nowrap ${bizFilter === b.id ? "bg-white border border-[var(--p-line)]" : ""}`}>
                <Dot color={b.portalColor} /> {b.portalShort} <span className="ml-auto p-faint text-[13px] pl-2">{n}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex gap-1 border-b border-[var(--p-line)]">
            {[
              ["docs", `Documents · ${docs.length}`],
              ["logins", `Logins and access · ${logins.length}`],
            ].map(([k, label]) => (
              <Link key={k} href={href({ tab: k })} className={`min-h-11 flex items-center px-4 font-semibold no-underline -mb-px border-b-[3px] ${tab === k ? "border-[var(--p-ink)]" : "border-transparent p-muted"}`}>
                {label}
              </Link>
            ))}
          </div>

          {tab === "docs" ? (
            <>
              <section className="p-card overflow-hidden">
                {shownDocs.length === 0 && <p className="p-4 p-muted">No documents here yet.</p>}
                {shownDocs.map((d) => {
                  const b = d.projectId ? bizById.get(d.projectId) : undefined;
                  return (
                    <div key={d.id} className="p-row flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <a href={`/files/${d.id}?inline=1`} target="_blank" rel="noreferrer" className="font-semibold no-underline hover:underline">
                          {d.name}
                        </a>
                        <span className="block text-[12px] p-faint">
                          {d.category ? `${d.category} · ` : ""}
                          {d.createdAt.toLocaleDateString("en-US", { timeZone: ctx.client.timezone, month: "short", day: "numeric" })} · {d.uploadedBy.name.split(" ")[0]}
                          {d.expiresAt ? ` · expires ${fmtShort(d.expiresAt)}` : ""}
                        </span>
                      </div>
                      <BizTag short={b?.portalShort} color={b?.portalColor} />
                      <details className="relative">
                          <summary className="p-btn p-btn-sm list-none">⋯</summary>
                          <div className="absolute right-0 z-10 mt-2 w-56 p-card p-2 shadow-lg flex flex-col">
                            <a href={`/files/${d.id}`} className="px-3 py-2 rounded-lg hover:bg-[var(--p-bg)] no-underline">
                              Download
                            </a>
                            <form action={deletePortalDocument}>
                              <input type="hidden" name="id" value={d.id} />
                              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FEF2F2] text-[#B91C1C]">Delete file</button>
                            </form>
                          </div>
                        </details>
                    </div>
                  );
                })}
              </section>
              <details className="p-card p-4" open={docs.length === 0}>
                <summary className="cursor-pointer font-semibold">+ Upload a document</summary>
                <div className="mt-4">
                  <UploadForm businesses={businesses} defaultBiz={bizFilter ?? undefined} />
                </div>
              </details>
            </>
          ) : (
            <>
              <p className="rounded-xl bg-[#EFF6FF] text-[#1E3A8A] px-4 py-3 text-[13px]">
                Passwords are never shown or stored here. They stay encrypted in the password manager; &ldquo;Open&rdquo; takes you to it, and it asks you to verify. Each open is logged.
              </p>
              <section className="p-card overflow-hidden">
                {shownLogins.length === 0 && <p className="p-4 p-muted">No logins recorded yet.</p>}
                {shownLogins.map((l) => {
                  const b = l.projectId ? bizById.get(l.projectId) : undefined;
                  const a = age(l.lastChangedAt, now);
                  return (
                    <div key={l.id} className="p-row flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <span className="font-semibold">{l.service}</span>
                        <span className="block text-[12px] p-faint">Shared with: {l.sharedWith}</span>
                      </div>
                      {b ? <BizTag short={b.portalShort} color={b.portalColor} /> : <span className="p-tag bg-[#E5E7EB] text-[#374151]">Personal</span>}
                      <span className="p-pill" style={l.twoFactor ? { background: "#ECFDF5", color: "#065F46" } : { background: "#FEE2E2", color: "#B91C1C" }}>
                        2-step {l.twoFactor ? "on" : "off"}
                      </span>
                      <span className={`text-[13px] w-24 ${a.old ? "text-[#B91C1C] font-bold" : "p-muted"}`}>{a.text}</span>
                      {l.url && (
                        <form action={openPortalLogin}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="p-btn p-btn-sm">Open</button>
                        </form>
                      )}
                      <Link href={`/vault?tab=logins&edit=${l.id}`} className="p-btn p-btn-sm">
                        Edit
                      </Link>
                    </div>
                  );
                })}
              </section>
              {editLogin && logins.some((l) => l.id === editLogin) ? (
                (() => {
                  const l = logins.find((x) => x.id === editLogin)!;
                  return (
                    <div className="p-card p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h2 className="p-h2">Edit {l.service}</h2>
                        <form action={deletePortalLogin}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="p-btn p-btn-sm p-btn-danger">Remove</button>
                        </form>
                      </div>
                      <LoginDetailsForm
                        businesses={businesses}
                        values={{
                          id: l.id,
                          service: l.service,
                          sharedWith: l.sharedWith,
                          projectId: l.projectId ?? "",
                          twoFactor: l.twoFactor,
                          url: l.url ?? "",
                          lastChangedAt: dateInputValue(l.lastChangedAt),
                        }}
                      />
                    </div>
                  );
                })()
              ) : (
                <details className="p-card p-4">
                  <summary className="cursor-pointer font-semibold">+ Add a login</summary>
                  <div className="mt-4">
                    <LoginDetailsForm businesses={businesses} values={{ service: "", sharedWith: "", projectId: bizFilter ?? "", twoFactor: true, url: "", lastChangedAt: "" }} />
                  </div>
                </details>
              )}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="p-card p-4 flex flex-col gap-2.5">
            <h2 className="p-h2">Expiring in 60 days</h2>
            {expiring.length === 0 && <p className="p-muted text-[13px]">Nothing due.</p>}
            {expiring.map((x) => {
              const b = x.biz ? bizById.get(x.biz) : undefined;
              return (
                <div key={x.key} className="flex flex-col">
                  <span className="text-[13px] font-semibold">{x.name}</span>
                  <span className="text-[12px] p-faint">
                    {b?.portalShort ?? "Personal"} · <span className={x.when === "change now" || x.when === "expired" ? "text-[#B91C1C] font-bold" : ""}>{x.when}</span>
                  </span>
                </div>
              );
            })}
          </section>
          <section className="p-card p-4 flex flex-col gap-2.5">
            <h2 className="p-h2">Access log</h2>
            {log.length === 0 && <p className="p-muted text-[13px]">No activity yet.</p>}
            {log.map((g) => (
              <div key={g.id} className="flex flex-col">
                <span className="text-[13px]">
                  <span className="font-semibold">{g.user?.name.split(" ")[0] ?? "Someone"}</span> {g.action} {g.target}
                </span>
                <span className="text-[12px] p-faint">{fmtStamp(g.createdAt, ctx.client.timezone)}</span>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

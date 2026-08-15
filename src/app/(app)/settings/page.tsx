import { requireRole } from "@/lib/dal";
import { listApiKeys } from "@/lib/integrations";
import { listTeam } from "@/lib/team";
import ApiKeyManager from "./_components/api-key-manager";
import AddMemberForm from "./_components/add-member-form";
import { resetUserPassword, setUserRole, toggleUserActive } from "./team-actions";

const input =
  "bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const smallBtn =
  "bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full transition-colors shrink-0";

const ROLE_LABEL: Record<string, string> = { OWNER: "Admin", MANAGER: "Manager", STAFF: "Staff" };

function fmtDate(d: Date | null): string {
  return d
    ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

export default async function SettingsPage() {
  const session = await requireRole("OWNER", "MANAGER");
  const isOwner = session.role === "OWNER";
  const [keys, team] = await Promise.all([
    listApiKeys(),
    isOwner ? listTeam() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-10 max-w-4xl">
      {/* ── Team (owners only) ── */}
      {isOwner && (
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Team</span>
            <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">Members &amp; Access</h2>
            <p className="mt-1 text-black/50">
              Add your team, set roles, and manage sign-in. New members get a temporary
              password you share with them; they change it after first login.
            </p>
          </div>

          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Add a member</h3>
            <AddMemberForm />
          </section>

          <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Members</h3>
            <ul className="divide-y divide-black/[0.06]">
              {team.map((u) => {
                const self = u.id === session.userId;
                return (
                  <li key={u.id} className="py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink flex items-center gap-2">
                          {u.name}
                          {self && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-brand bg-brand-pale px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                          {!u.isActive && (
                            <span className="text-[9px] font-bold uppercase tracking-wide text-black/50 bg-black/5 px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-black/50 truncate">{u.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wide text-ink/70">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                        <p className="text-[11px] text-black/40">
                          Last login {fmtDate(u.lastLoginAt)}
                        </p>
                      </div>
                    </div>

                    <details className="group mt-2">
                      <summary className="text-xs font-bold uppercase tracking-wide text-brand cursor-pointer list-none">
                        Manage
                      </summary>
                      <div className="mt-3 space-y-2">
                        <form action={setUserRole} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <select name="role" defaultValue={u.role} className={`${input} flex-1`}>
                            <option value="OWNER">Admin (Owner)</option>
                            <option value="MANAGER">Manager</option>
                            <option value="STAFF">Staff</option>
                          </select>
                          <button type="submit" className={smallBtn}>Save role</button>
                        </form>

                        <form action={resetUserPassword} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={u.id} />
                          <input
                            name="password"
                            type="text"
                            minLength={8}
                            required
                            placeholder="New temporary password"
                            className={`${input} flex-1`}
                          />
                          <button type="submit" className={smallBtn}>Reset</button>
                        </form>

                        {!self && (
                          <form action={toggleUserActive}>
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="text-xs font-semibold text-ink/60 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                            >
                              {u.isActive ? "Deactivate sign-in" : "Reactivate sign-in"}
                            </button>
                          </form>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}

      {/* ── Integrations ── */}
      <div className="space-y-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Integrations</span>
          <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">n8n Automation</h2>
          <p className="mt-1 text-black/50">
            Let outside tools (n8n, Slack, client CRMs) push data into the command center.
          </p>
        </div>

        <section className="bg-white rounded-2xl border border-black/[0.07] p-6">
          <h3 className="font-display text-2xl tracking-wide text-ink">Inbound API Keys</h3>
          <p className="text-sm text-black/50 mt-1 mb-4">
            Let an automation create tasks by calling{" "}
            <code className="bg-cream px-1.5 py-0.5 rounded text-ink">POST /api/tasks</code> with header{" "}
            <code className="bg-cream px-1.5 py-0.5 rounded text-ink">x-api-key: &lt;key&gt;</code>.
          </p>
          <ApiKeyManager initial={keys} />
        </section>
      </div>
    </div>
  );
}

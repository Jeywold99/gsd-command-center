import { requireRole } from "@/lib/dal";
import { listApiKeys } from "@/lib/integrations";
import ApiKeyManager from "./_components/api-key-manager";

export default async function SettingsPage() {
  await requireRole("OWNER", "MANAGER");
  const keys = await listApiKeys();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">Integrations</span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">n8n Automation</h2>
        <p className="mt-1 text-black/50">
          Let outside tools (n8n, Slack, client CRMs) push data into the command center.
        </p>
      </div>

      {/* API keys (inbound) */}
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
  );
}

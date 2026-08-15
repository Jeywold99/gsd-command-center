import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { createClient } from "../actions";
import ClientForm from "../_components/client-form";

export default async function NewClientPage() {
  await requireRole("OWNER", "MANAGER");

  return (
    <div className="space-y-6">
      <Link
        href="/crm"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to CRM
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
          New Record
        </span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">
          Add Client or Lead
        </h2>
      </div>
      <ClientForm action={createClient} mode="create" />
    </div>
  );
}

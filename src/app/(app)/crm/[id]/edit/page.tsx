import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { getClientById } from "@/lib/crm";
import { updateClient } from "../../actions";
import ClientForm from "../../_components/client-form";

const toDateInput = (d: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("OWNER", "MANAGER");
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const rate = client.billingRates[0];

  return (
    <div className="space-y-6">
      <Link
        href={`/crm/${client.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
          Edit
        </span>
        <h2 className="mt-1 font-display text-4xl tracking-wide text-ink">
          {client.companyName}
        </h2>
      </div>
      <ClientForm
        action={updateClient}
        mode="edit"
        defaults={{
          id: client.id,
          companyName: client.companyName,
          serviceType: client.serviceType ?? "",
          website: client.website ?? "",
          health: client.health ?? "",
          colorHex: client.colorHex ?? "#FF5C00",
          startDate: toDateInput(client.startDate),
          renewalDate: toDateInput(client.renewalDate),
          billingType: rate?.type ?? "HOURLY",
          billingRate: rate?.rate != null ? String(rate.rate) : "",
          hoursPerWeek: rate?.hoursPerWeek != null ? String(rate.hoursPerWeek) : "",
        }}
      />
    </div>
  );
}

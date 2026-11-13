import { redirect } from "next/navigation";
import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses } from "@/lib/portal/data";

export default async function BusinessesIndex({ params }: PageProps<"/portal/[slug]/b">) {
  const { slug } = await params;
  const ctx = await getPortalContext(slug);
  const [first] = await listBusinesses(ctx.client.id);
  redirect(first ? `/b/${first.id}` : "/");
}

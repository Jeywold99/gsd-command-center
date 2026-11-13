import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";
import { requirePortal, logAccess } from "@/lib/portal/dal";

// Portal file download: only this client's portal files. Every open is logged.
export async function GET(req: NextRequest, ctx: RouteContext<"/portal/[slug]/files/[id]">) {
  let portal;
  try {
    portal = await requirePortal();
  } catch {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { slug, id } = await ctx.params;
  if (slug !== portal.client.portalSlug) return new NextResponse("Not found", { status: 404 });

  const doc = await prisma.document.findFirst({
    where: { id, clientId: portal.client.id, portalVisibility: { not: null } },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  try {
    const buf = await readFile(doc.storagePath);
    await logAccess(portal, inline ? "viewed" : "downloaded", doc.name);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(doc.name)}"`,
        "Content-Length": String(doc.sizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 410 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

// Auth-gated file download. Files live outside /public so they are never
// served statically — only through this handler after a session check.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const session = await getSessionFromCookie();
  if (!session?.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await ctx.params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  try {
    const buf = await readFile(doc.storagePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.name)}"`,
        "Content-Length": String(doc.sizeBytes),
      },
    });
  } catch {
    return new NextResponse("File missing", { status: 410 });
  }
}

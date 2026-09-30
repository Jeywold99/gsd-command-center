import { NextResponse, type NextRequest } from "next/server";
import path from "path";
import { getSessionFromCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

// Profile photos. Signed-in team members only (photos live outside /public).
// The URL carries the file's storage key (?v=…), which changes on every
// upload — so responses can be cached for a long time.

const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/avatars/[userId]">) {
  const session = await getSessionFromCookie();
  if (!session?.userId) return new NextResponse("Unauthorized", { status: 401 });

  const { userId } = await ctx.params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const key = user?.avatarUrl ? new URL(user.avatarUrl, "http://x").searchParams.get("v") : null;
  if (!key) return new NextResponse("Not found", { status: 404 });

  try {
    const buf = await readFile(key);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(key)] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

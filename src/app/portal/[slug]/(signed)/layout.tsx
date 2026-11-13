import Link from "next/link";
import { getPortalContext } from "@/lib/portal/dal";
import { portalSignOut } from "../login/actions";
import { PortalNav, PortalTabBar } from "./_components/nav";

export default async function SignedLayout({ children, params }: LayoutProps<"/portal/[slug]">) {
  const { slug } = await params;
  const ctx = await getPortalContext(slug);
  const initials = ctx.user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gsdUrl = process.env.GSD_PUBLIC_URL || "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-[var(--p-line)] sticky top-0 z-20 pt-safe">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-14 flex items-center gap-6">
          <Link href="/" className="font-bold text-[15px] no-underline whitespace-nowrap">
            Command Center
          </Link>
          <PortalNav />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-right leading-tight">
              <span className="block text-[13px] font-semibold">{ctx.user.name}</span>
              <span className="block text-[12px] p-faint">{ctx.isTeam ? "EA team" : "Full access"}</span>
            </span>
            <details className="relative">
              <summary className="list-none cursor-pointer size-9 rounded-full bg-[var(--p-ink)] text-white grid place-items-center text-[13px] font-bold">
                {initials}
              </summary>
              <div className="absolute right-0 mt-2 w-56 p-card p-2 shadow-lg z-30 flex flex-col">
                <span className="px-3 py-2 text-[13px] p-muted break-all">{ctx.user.email}</span>
                <Link href="/trash" className="px-3 py-2 rounded-lg hover:bg-[var(--p-bg)] no-underline">
                  Deleted tasks
                </Link>
                <Link href="/how-it-works" className="px-3 py-2 rounded-lg hover:bg-[var(--p-bg)] no-underline">
                  How this works
                </Link>
                {ctx.isTeam && gsdUrl !== "/" && (
                  <a href={gsdUrl} className="px-3 py-2 rounded-lg hover:bg-[var(--p-bg)] no-underline">
                    Open GSD
                  </a>
                )}
                <form action={portalSignOut}>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--p-bg)]">Sign out</button>
                </form>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="p-main flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
      <PortalTabBar />
    </div>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { getPortalClient } from "@/lib/portal/dal";
import "../portal.css";

// Client portal frame: its own font and colours, none of the GSD shell.
// Signed-in pages add their own top bar in (signed)/layout.tsx; the sign-in
// page renders without one.

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export async function generateMetadata({ params }: LayoutProps<"/portal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const client = await getPortalClient(slug);
  const name = client ? `${client.companyName} · Command Center` : "Command Center";
  return {
    title: name,
    applicationName: "Command Center",
    appleWebApp: { capable: true, title: "Command Center", statusBarStyle: "default" },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#F4F5F7" };

export default async function PortalLayout({ children, params }: LayoutProps<"/portal/[slug]">) {
  const { slug } = await params;
  if (!(await getPortalClient(slug))) notFound();
  return <div className={`portal ${inter.variable}`}>{children}</div>;
}

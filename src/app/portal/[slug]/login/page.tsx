import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getPortalClient } from "@/lib/portal/dal";
import { listBusinesses } from "@/lib/portal/data";
import {
  PORTAL_COOKIE,
  PORTAL_PENDING_COOKIE,
  readPortalPending,
  readPortalSession,
} from "@/lib/portal/session";
import { totpUri } from "@/lib/totp";
import { CredentialsForm, CodeForm } from "./forms";
import { portalCancelSignIn } from "./actions";

export default async function PortalLoginPage({ params }: PageProps<"/portal/[slug]/login">) {
  const { slug } = await params;
  const client = (await getPortalClient(slug))!;
  const jar = await cookies();

  const session = await readPortalSession(jar.get(PORTAL_COOKIE)?.value);
  if (session?.slug === slug) redirect("/");

  const pending = await readPortalPending(jar.get(PORTAL_PENDING_COOKIE)?.value);
  const step = pending && pending.slug === slug ? pending : null;
  const businesses = await listBusinesses(client.id);

  let enroll: { qr: string; key: string } | null = null;
  if (step?.stage === "enroll" && step.sec) {
    const user = await prisma.user.findUnique({ where: { id: step.pu }, select: { email: true } });
    const uri = totpUri(step.sec, user?.email ?? "account", `${client.companyName} Command Center`);
    enroll = {
      qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }),
      key: step.sec.replace(/(.{4})/g, "$1 ").trim(),
    };
  }

  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="hidden md:flex flex-col justify-center gap-6 bg-white border-r border-[var(--p-line)] px-14 py-16">
        <div className="flex flex-col gap-3 max-w-md">
          <span className="text-[13px] font-semibold text-[var(--p-faint)]">{client.companyName}</span>
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight">Command Center</h1>
          <p className="text-[18px] text-[var(--p-muted)]">Everything we&apos;re handling for you, in one place.</p>
          <p className="p-muted">
            Tasks by business and by month, your approvals, documents and secure access, kept up to date by your EA team.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {businesses.map((b) => (
            <li key={b.id} className="flex items-center gap-3 font-semibold">
              <span className="size-2.5 rounded-[3px]" style={{ background: b.portalColor ?? "#374151" }} />
              {b.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="md:hidden">
            <p className="text-[13px] font-semibold text-[var(--p-faint)]">{client.companyName}</p>
            <h1 className="p-h1">Command Center</h1>
          </div>

          <div className="p-card p-6 flex flex-col gap-5">
            {!step && (
              <>
                <h2 className="text-xl font-bold">Sign in</h2>
                <CredentialsForm />
              </>
            )}

            {step?.stage === "verify" && (
              <>
                <div>
                  <h2 className="text-xl font-bold">Two-step verification</h2>
                  <p className="p-muted mt-1">Open your authenticator app and enter the 6-digit code for this Command Center.</p>
                </div>
                <CodeForm label="Code" />
              </>
            )}

            {step?.stage === "enroll" && enroll && (
              <>
                <div>
                  <h2 className="text-xl font-bold">Set up two-step verification</h2>
                  <p className="p-muted mt-1">
                    One time only. Scan this with an authenticator app on your phone (Google Authenticator, Microsoft
                    Authenticator, 1Password or Bitwarden), then enter the 6-digit code it shows.
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enroll.qr} alt="QR code for your authenticator app" width={220} height={220} className="self-center rounded-lg border border-[var(--p-line)]" />
                <details className="text-[13px]">
                  <summary className="cursor-pointer p-muted">Can&apos;t scan? Enter this key instead</summary>
                  <code className="block mt-2 p-3 rounded-lg bg-[var(--p-bg)] font-mono text-[13px] break-all select-all">{enroll.key}</code>
                </details>
                <CodeForm label="Code from the app" />
              </>
            )}

            {step && (
              <form action={portalCancelSignIn}>
                <button className="text-[13px] p-muted underline">Use a different account</button>
              </form>
            )}
          </div>

          <p className="p-faint text-[13px]">
            Forgot your password or lost your phone? Ask your EA team to reset it for you.
          </p>
        </div>
      </section>
    </main>
  );
}

import { cookies } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getPortalContext } from "@/lib/portal/dal";
import { PORTAL_SETUP_COOKIE, readPortalPending } from "@/lib/portal/session";
import { totpUri } from "@/lib/totp";
import { fmtDayTz } from "@/lib/portal/shared";
import { ChangePasswordForm, ConfirmTwoStepForm, TurnOffTwoStepForm } from "./forms";
import { cancelTwoStep, startTwoStep } from "./actions";

// Each person's own settings: password and (optional) two-step verification.
export default async function SettingsPage({ params }: PageProps<"/portal/[slug]/settings">) {
  const { slug } = await params;
  const ctx = await getPortalContext(slug);
  const user = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { email: true, totpEnabledAt: true, totpSecret: true },
  });
  const twoStepOn = !!(user?.totpEnabledAt && user.totpSecret);

  const setup = await readPortalPending((await cookies()).get(PORTAL_SETUP_COOKIE)?.value);
  let qr: { img: string; key: string } | null = null;
  if (!twoStepOn && setup && setup.pu === ctx.user.id && setup.sec) {
    const uri = totpUri(setup.sec, ctx.user.email, `${ctx.client.companyName} Command Center`);
    qr = { img: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), key: setup.sec.replace(/(.{4})/g, "$1 ").trim() };
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="p-h1">Settings</h1>
        <p className="p-muted mt-1">
          Signed in as {ctx.user.name} ({ctx.user.email}). These settings are just for your own sign-in.
        </p>
      </div>

      <section className="p-card p-5 md:p-6 flex flex-col gap-4">
        <div>
          <h2 className="p-h2">Change password</h2>
          <p className="p-muted text-[13px] mt-1">You&apos;ll stay signed in here; the new password is for next time.</p>
        </div>
        <ChangePasswordForm email={ctx.user.email} />
      </section>

      <section className="p-card p-5 md:p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="p-h2">Two-step verification</h2>
          <span className="p-pill" style={twoStepOn ? { background: "#D1FAE5", color: "#065F46" } : { background: "#F3F4F6", color: "#374151" }}>
            {twoStepOn ? "On" : "Off"}
          </span>
        </div>
        <p className="p-muted text-[13px] -mt-2">
          Optional. When it&apos;s on, signing in also asks for a 6-digit code from an authenticator app on your phone
          (Google Authenticator, Microsoft Authenticator, 1Password or Bitwarden), so a stolen password alone can&apos;t get in.
        </p>

        {twoStepOn ? (
          <>
            <p className="text-[13px]">Turned on {fmtDayTz(user!.totpEnabledAt, ctx.client.timezone)}.</p>
            <TurnOffTwoStepForm />
          </>
        ) : qr ? (
          <div className="flex flex-col gap-4">
            <p className="text-[14px]">Scan this with your authenticator app, then enter the 6-digit code it shows.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.img} alt="QR code for your authenticator app" width={220} height={220} className="rounded-lg border border-[var(--p-line)]" />
            <details className="text-[13px]">
              <summary className="cursor-pointer p-muted">Can&apos;t scan? Enter this key instead</summary>
              <code className="block mt-2 p-3 rounded-lg bg-[var(--p-bg)] font-mono text-[13px] break-all select-all max-w-sm">{qr.key}</code>
            </details>
            <ConfirmTwoStepForm />
            <form action={cancelTwoStep}>
              <button className="text-[13px] p-muted underline">Cancel</button>
            </form>
          </div>
        ) : (
          <form action={startTwoStep}>
            <button className="p-btn p-btn-primary">Turn on two-step verification</button>
          </form>
        )}
      </section>
    </div>
  );
}

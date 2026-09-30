import Link from "next/link";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import AvatarUploader from "./_components/avatar-uploader";
import VoiceKeyCard from "./_components/voice-key-card";
import { AccountForm, PasswordForm } from "./_components/account-forms";
import PushToggle from "./_components/push-toggle";
import { pushPublicKey } from "@/lib/push";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const voiceKey = await prisma.voiceKey.findUnique({
    where: { userId: user.id },
    select: { lastUsedAt: true },
  });
  const canSeeSettings = user.role === "OWNER" || user.role === "MANAGER";

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        <AvatarUploader name={user.name} role={user.role} src={user.avatarUrl} />
        <AccountForm name={user.name} email={user.email} />
      </div>

      <div className="flex flex-col gap-4">
        <VoiceKeyCard hasKey={!!voiceKey} lastUsedAt={voiceKey?.lastUsedAt ?? null} />

        <PushToggle publicKey={pushPublicKey()} />

        <section aria-labelledby="setup-h" className="flex flex-col gap-3 rounded-[22px] border border-black/[0.07] bg-white p-4">
          <h2 id="setup-h" className="text-base font-bold">
            Connect your iPhone Shortcut
          </h2>
          <ol className="flex flex-col gap-3">
            {[
              "Copy your voice key above.",
              "In the Voice note Shortcut, open Get Contents of URL → Request Body (Form) and add a Text field named voice_key.",
              "Paste your key as its value, then record a short test note.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-brand-pale font-bold text-[#6E2800]">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <nav aria-label="Account" className="rounded-[22px] border border-black/[0.07] bg-white px-4">
          <PasswordForm />
          {canSeeSettings && (
            <Link href="/settings" className="flex min-h-14 items-center gap-3.5 border-b border-black/[0.06]">
              <Settings className="w-5 h-5" />
              <span className="flex-1 text-[15px] font-semibold">Team settings</span>
              <ChevronRight className="w-4 h-4 text-[#6B645D]" />
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="flex min-h-14 w-full items-center gap-3.5 text-[#B42318]">
              <LogOut className="w-5 h-5" />
              <span className="text-[15px] font-semibold">Log out</span>
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}

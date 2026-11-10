import { redirect } from "next/navigation";
import { getPipelineAccess } from "@/lib/pipeline/access";
import SubNav from "./_components/sub-nav";

// The Pipeline is private to Eldwin and Jana: anyone else is sent home before any data is fetched.
// (Every server action in actions.ts runs the same check again.)
export default async function PipelineLayout({ children }: { children: React.ReactNode }) {
  const access = await getPipelineAccess();
  if (access.kind === "denied") redirect("/");

  if (access.kind === "unavailable") {
    return (
      <div className="mx-auto max-w-xl rounded-[22px] border border-black/[0.07] bg-white p-6">
        <h2 className="font-display text-[34px] leading-none tracking-[0.01em]">Pipeline is not available</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#6B645D]">{access.reason}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#6B645D]">
          Nothing is wrong with the rest of the Command Center. Reload in a moment, or check the Supabase settings on the server.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SubNav />
      {children}
    </div>
  );
}

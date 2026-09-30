import { Mic } from "lucide-react";

// Desktop right pane when no note is selected (phones show only the list).
export default function VoiceIndexPage() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[22px] border border-black/[0.07] bg-white p-8 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pale text-[#B34100]">
        <Mic className="w-6 h-6" />
      </span>
      <p className="text-lg font-semibold">Pick a voice note</p>
      <p className="mt-1 max-w-sm text-sm text-[#6B645D]">
        Each transcription shows the tasks, reminders and ideas it created for you.
      </p>
    </div>
  );
}

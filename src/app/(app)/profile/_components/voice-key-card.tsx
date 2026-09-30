"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Eye, EyeOff, RefreshCw, KeyRound } from "lucide-react";
import LocalTime from "../../_components/local-time";
import { createVoiceKey, revealVoiceKey } from "../actions";

// Personal voice key: the iPhone Shortcut sends it (through n8n) so incoming
// transcriptions are filed under this user only.
export default function VoiceKeyCard({
  hasKey,
  lastUsedAt,
}: {
  hasKey: boolean;
  lastUsedAt: Date | null;
}) {
  const [key, setKey] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [exists, setExists] = useState(hasKey);

  const ensureKey = async () => key ?? (await revealVoiceKey());

  const copy = () =>
    start(async () => {
      const k = await ensureKey();
      if (!k) return;
      setKey(k);
      try {
        await navigator.clipboard.writeText(k);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setShown(true); // clipboard blocked — show it so it can be copied by hand
      }
    });

  const toggleShow = () =>
    start(async () => {
      if (!shown) setKey(await ensureKey());
      setShown((s) => !s);
    });

  const generate = () =>
    start(async () => {
      const k = await createVoiceKey();
      setKey(k);
      setExists(true);
      setShown(true);
      setConfirming(false);
    });

  const masked = key && shown ? key : "gsdv_••••••••••••••••••••";

  return (
    <section
      id="voice-key"
      aria-labelledby="vk-h"
      className="scroll-mt-24 flex flex-col gap-3.5 rounded-3xl bg-midnight p-4.5 text-white"
    >
      <div className="flex items-center justify-between">
        <h2 id="vk-h" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-white/70">
          <KeyRound className="w-4 h-4" />
          Your voice key
        </h2>
        {exists && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#7BE0B6]">
            <span className="h-2 w-2 rounded-full bg-success" />
            Active
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-white/75">
        Your iPhone Shortcut sends this key with every recording, so transcriptions land in your account and
        nobody else&apos;s.
      </p>

      {exists ? (
        <>
          <div className="flex items-center gap-2 rounded-[14px] bg-white/[0.08] py-2 pr-2 pl-3.5">
            <code className="min-w-0 flex-1 truncate font-mono text-[15px] tracking-wide">{masked}</code>
            <button
              type="button"
              onClick={toggleShow}
              aria-label={shown ? "Hide key" : "Show key"}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] hover:bg-white/10"
            >
              {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={copy}
              disabled={pending}
              className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[15px] font-bold text-ink disabled:opacity-60"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy key"}
            </button>
            <button
              type="button"
              onClick={() => (confirming ? generate() : setConfirming(true))}
              disabled={pending}
              className={`flex h-[46px] items-center justify-center gap-2 rounded-[14px] border text-[15px] font-semibold disabled:opacity-60 ${
                confirming ? "border-[#FF9A9A] bg-[#B42318]/30" : "border-white/25"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {confirming ? "Yes, replace it" : "Regenerate"}
            </button>
          </div>
          {confirming && (
            <p className="text-[13px] text-[#FFC9C9]">
              The old key stops working immediately — you&apos;ll need to paste the new one into your Shortcut.{" "}
              <button type="button" onClick={() => setConfirming(false)} className="font-semibold underline">
                Cancel
              </button>
            </p>
          )}
          <p className="text-[13px] text-white/70">
            {lastUsedAt ? (
              <>
                Last used <LocalTime date={lastUsedAt} format="datetime" />
              </>
            ) : (
              "Not used yet — record a test note after setting up your Shortcut."
            )}
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[15px] font-bold text-ink disabled:opacity-60"
        >
          <KeyRound className="w-4 h-4" />
          Generate my voice key
        </button>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Share } from "lucide-react";
import { sendTestPush } from "../actions";

type Status = "loading" | "unsupported" | "install" | "denied" | "off" | "on" | "unconfigured";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? navigator.serviceWorker.register("/sw.js");
}

// "Notifications on this device" — subscribes this browser/installed app to
// Web Push. On iPhone, push only works once GSD HQ is added to the Home Screen.
export default function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      let next: Status;
      if (!publicKey) next = "unconfigured";
      else if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isIos() && !isStandalone() ? "install" : "unsupported";
      } else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      setStatus(next);
    })().catch(() => setStatus("unsupported"));
  }, [publicKey]);

  const enable = () =>
    start(async () => {
      setMsg(null);
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setStatus("on");
      else setMsg("Couldn't save this device — try again.");
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    });

  const on = status === "on";

  return (
    <section aria-labelledby="notif-h" className="rounded-[22px] border border-black/[0.07] bg-white px-4 py-1">
      <h2 id="notif-h" className="mt-3 mb-1 flex items-center gap-2 text-base font-bold">
        <BellRing className="w-[18px] h-[18px]" />
        Notifications on this device
      </h2>
      <div className="flex min-h-[60px] items-center gap-3">
        <span className="flex-1 text-[15px]">
          Voice notes processed, reminders and new assignments
        </span>
        {(status === "on" || status === "off") && (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Push notifications"
            disabled={pending}
            onClick={on ? disable : enable}
            className={`flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-60 ${
              on ? "justify-end bg-brand" : "justify-start bg-[#D9D2CA]"
            }`}
          >
            <span className="h-[26px] w-[26px] rounded-full bg-white shadow-sm" />
          </button>
        )}
      </div>
      {status === "install" && (
        <p className="mb-3.5 flex items-start gap-2 rounded-2xl bg-brand-pale p-3 text-sm text-[#6E2800]">
          <Share className="mt-0.5 w-4 h-4 shrink-0" />
          On iPhone, first add GSD HQ to your Home Screen (Share → Add to Home Screen), then open it from there
          and turn this on.
        </p>
      )}
      {status === "denied" && (
        <p className="mb-3.5 text-sm text-[#B42318]">
          Notifications are blocked for this app. Allow them in your device/browser settings, then reload.
        </p>
      )}
      {status === "unsupported" && (
        <p className="mb-3.5 text-sm text-[#6B645D]">This browser doesn&apos;t support push notifications.</p>
      )}
      {status === "unconfigured" && (
        <p className="mb-3.5 text-sm text-[#6B645D]">
          Push isn&apos;t set up on the server yet (VAPID keys missing). In-app notifications still work.
        </p>
      )}
      {on && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await sendTestPush();
              setMsg("Test sent — it should arrive in a few seconds.");
            })
          }
          className="mb-3.5 text-sm font-semibold text-[#B34100] hover:underline"
        >
          Send a test notification
        </button>
      )}
      {msg && <p className="mb-3.5 text-sm text-[#4F4943]">{msg}</p>}
    </section>
  );
}

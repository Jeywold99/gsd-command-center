"use client";

import { useEffect } from "react";

// Registers the service worker (public/sw.js) once the page has loaded. Only in
// production builds — in `next dev` a SW would cache hot-reloaded chunks.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

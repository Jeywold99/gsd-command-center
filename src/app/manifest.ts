import type { MetadataRoute } from "next";

// Installable PWA manifest (served at /manifest.webmanifest). Add to Home Screen
// on iPhone / Install on desktop Chrome & Edge launches the command center
// full-screen with the GSD icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GSD HQ Command Center",
    short_name: "GSD HQ",
    description: "Get Sh*t Done HQ internal operations command center.",
    id: "/",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F0EB",
    theme_color: "#1E1E2E",
    icons: [
      { src: "/icons/icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Tasks", url: "/tasks" },
      { name: "Voice notes", url: "/voice" },
      { name: "Calendar", url: "/calendar" },
    ],
  };
}

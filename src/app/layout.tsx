import type { Metadata, Viewport } from "next";
import { Outfit, Bebas_Neue } from "next/font/google";
import PwaRegister from "./pwa-register";
import "./globals.css";

// Body / UI font — Outfit is a variable font (weights 400–800)
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

// Display font — Bebas Neue, single weight, self-hosted (no external request)
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GSD HQ — Command Center",
  description: "Get Shit Done HQ internal operations command center.",
  applicationName: "GSD HQ",
  // Installed to the iPhone Home Screen: full-screen, content under the status bar.
  appleWebApp: {
    capable: true,
    title: "GSD HQ",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets the app draw edge-to-edge; the shell pads for the
// notch / home indicator with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1E1E2E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Outfit, Bebas_Neue } from "next/font/google";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${bebas.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

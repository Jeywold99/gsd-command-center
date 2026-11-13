import { ExternalLink } from "lucide-react";

// "Open Command Center ↗" — links from GSD into a client's portal (its own
// site, so it opens in a new tab and uses the portal's own sign-in).
export default function CommandCenterLink({ href, label = "Open Command Center" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 border border-[#1E40AF]/25 bg-[#EFF6FF] text-[#1E40AF] hover:bg-[#DBEAFE] text-sm font-semibold px-3.5 py-2 rounded-full transition whitespace-nowrap"
    >
      {label}
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  );
}

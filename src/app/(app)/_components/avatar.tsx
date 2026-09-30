// A person's profile photo, or their initials on a dark tile when they have
// none. Size and shape come from the caller's className (default 40px circle).

export function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function Avatar({
  name,
  src,
  className = "w-10 h-10 text-sm",
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image, not optimizable
      <img
        src={src}
        alt={name}
        className={`shrink-0 rounded-full object-cover bg-midnight ${className}`}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={`shrink-0 rounded-full bg-midnight text-[#FF7A33] font-display tracking-wide inline-flex items-center justify-center ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-midnight text-white flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Ghost watermark */}
      <span className="pointer-events-none select-none absolute -bottom-16 -right-10 font-display text-[280px] leading-none text-white/[0.04] tracking-wide">
        GSD
      </span>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
            Get Sh*t Done · HQ
          </span>
          <h1 className="mt-2 font-display text-5xl leading-none tracking-wide">
            Command Center
          </h1>
        </div>

        <div className="bg-white text-ink rounded-2xl p-7 border border-black/[0.06] shadow-xl">
          <h2 className="font-display text-2xl tracking-wide">Sign In</h2>
          <p className="text-sm text-black/50 mt-0.5 mb-5">
            Welcome back — let&apos;s get sh*t done.
          </p>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          Internal use only · GSD HQ
        </p>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * LinkVault symbol: a vault door made of two interlocking bookmark ribbons,
 * with a keyhole notch. Uses currentColor + primary so it adapts to every theme.
 */
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" className={mono ? "fill-foreground" : "fill-primary"} />
      <path
        d="M10 8h7v15.5l-3.5-2.6L10 23.5z"
        className={mono ? "fill-background" : "fill-primary-foreground"}
      />
      <path
        d="M15 11h7v13l-3.5-2.6L15 24z"
        className={mono ? "fill-background" : "fill-primary-foreground"}
        opacity="0.55"
      />
      <circle cx="13.5" cy="12.5" r="1.5" className={mono ? "fill-foreground" : "fill-primary"} />
    </svg>
  );
}

export function Logo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 shrink-0" />
      {!collapsed && (
        <span className="font-display text-[1.15rem] font-semibold leading-none tracking-tight">
          Link<span className="text-primary">Vault</span>
        </span>
      )}
    </span>
  );
}

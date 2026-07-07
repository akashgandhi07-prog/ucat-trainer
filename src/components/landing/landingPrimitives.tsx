import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "../../lib/cn";

/** Small presentational primitives shared by the eager (above-the-fold) and lazy
 * (below-the-fold) landing sections. Kept in its own module so the below-the-fold
 * chunk does not have to import the eager sections module (which would pull heavy
 * data back into the main bundle). */

export function LandingContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{children}</p>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
}

export function SectionIntro({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl", className)}>
      {children}
    </p>
  );
}

export function TrustStars({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-amber-500", className)} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import BreadcrumbNav from "./BreadcrumbNav";
import TutoringUpsell from "./TutoringUpsell";
import type { BreadcrumbItem } from "../seo/SEOHead";
import { useAppShell } from "../../contexts/AppShellContext";
import { cn } from "../../lib/cn";
import { APP_CONTENT_WIDTH, APP_CONTENT_WIDTH_NARROW, APP_CONTENT_X } from "../../lib/appContentLayout";

export type SkillsSectionAccent = "blue" | "amber" | "emerald" | "primary";

const accentStyles: Record<SkillsSectionAccent, { iconBox: string }> = {
  blue: { iconBox: "bg-blue-500/10 text-blue-600" },
  amber: { iconBox: "bg-amber-500/10 text-amber-600" },
  emerald: { iconBox: "bg-emerald-500/10 text-emerald-600" },
  primary: { iconBox: "bg-primary/10 text-primary" },
};

type SkillsSectionLayoutProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: SkillsSectionAccent;
  breadcrumbs?: BreadcrumbItem[];
  showTutoringUpsell?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
  /** Wider content area (e.g. VR hub with 4 skill cards). */
  wide?: boolean;
};

export default function SkillsSectionLayout({
  title,
  description,
  icon: Icon,
  accent = "primary",
  breadcrumbs,
  showTutoringUpsell = true,
  headerExtra,
  children,
  wide = false,
}: SkillsSectionLayoutProps) {
  const inAppShell = useAppShell();

  return (
    <div
      className={cn(
        "flex flex-col bg-background font-sans",
        inAppShell ? "flex-1 min-h-0" : "min-h-screen",
      )}
    >
      <div className={cn("flex-1 py-6 sm:py-8", APP_CONTENT_X)}>
        <div className={wide ? APP_CONTENT_WIDTH : APP_CONTENT_WIDTH_NARROW}>
          <BreadcrumbNav items={breadcrumbs} />

          <header className="flex items-start gap-3 sm:gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-border">
            <div
              className={cn(
                "p-2.5 sm:p-3 rounded-xl shrink-0",
                accentStyles[accent].iconBox,
              )}
            >
              <Icon className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                {description}
              </p>
              {headerExtra ? <div className="mt-3">{headerExtra}</div> : null}
              {showTutoringUpsell ? (
                <div className="mt-4">
                  <TutoringUpsell variant="hub" />
                </div>
              ) : null}
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

/** Section heading used below the hub header (trainer groups). */
export function SkillsSectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

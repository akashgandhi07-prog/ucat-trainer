import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import BreadcrumbNav from "./BreadcrumbNav";
import type { BreadcrumbItem } from "../seo/SEOHead";
import { useAppShell } from "../../contexts/AppShellContext";
import { cn } from "../../lib/cn";
import { APP_CONTENT_X, appContentWidthClass } from "../../lib/appContentLayout";

export type SkillsSectionAccent = "blue" | "amber" | "emerald" | "primary" | "purple";

const accentStyles: Record<SkillsSectionAccent, { iconBox: string }> = {
  blue: { iconBox: "bg-blue-500/10 text-blue-600" },
  amber: { iconBox: "bg-amber-500/10 text-amber-600" },
  emerald: { iconBox: "bg-emerald-500/10 text-emerald-600" },
  primary: { iconBox: "bg-primary/10 text-primary" },
  purple: { iconBox: "bg-purple-500/10 text-purple-600" },
};

type SkillsSectionLayoutProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: SkillsSectionAccent;
  breadcrumbs?: BreadcrumbItem[];
  headerExtra?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

export default function SkillsSectionLayout({
  title,
  description,
  icon: Icon,
  accent = "primary",
  breadcrumbs,
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
        <div className={appContentWidthClass({ inAppShell, wide })}>
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
              {headerExtra ? <div className="mt-2 space-y-1">{headerExtra}</div> : null}
              <p
                className={cn(
                  "text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl",
                  headerExtra ? "mt-2" : "mt-1.5",
                )}
              >
                {description}
              </p>
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

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
    <section className="space-y-4 text-left">
      <div className="text-left">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground text-left">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground text-left">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export type HubTrainerCardAccent = "primary" | "amber" | "emerald" | "violet";

const accentStyles: Record<
  HubTrainerCardAccent,
  { iconBox: string; hoverBorder: string; hoverTitle: string; hoverChevron: string }
> = {
  primary: {
    iconBox: "bg-primary/10 text-primary",
    hoverBorder: "hover:border-primary/40",
    hoverTitle: "group-hover:text-primary",
    hoverChevron: "group-hover:text-primary",
  },
  amber: {
    iconBox: "bg-amber-500/10 text-amber-600",
    hoverBorder: "hover:border-amber-200",
    hoverTitle: "group-hover:text-amber-700",
    hoverChevron: "group-hover:text-amber-600",
  },
  emerald: {
    iconBox: "bg-emerald-500/10 text-emerald-600",
    hoverBorder: "hover:border-emerald-200",
    hoverTitle: "group-hover:text-emerald-700",
    hoverChevron: "group-hover:text-emerald-600",
  },
  violet: {
    iconBox: "bg-violet-500/10 text-violet-600",
    hoverBorder: "hover:border-violet-200",
    hoverTitle: "group-hover:text-violet-700",
    hoverChevron: "group-hover:text-violet-600",
  },
};

type HubTrainerCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  accent?: HubTrainerCardAccent;
};

export default function HubTrainerCard({
  title,
  description,
  icon: Icon,
  onClick,
  accent = "primary",
}: HubTrainerCardProps) {
  const styles = accentStyles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-stretch p-5 sm:p-6 text-left rounded-xl border border-border bg-card shadow-sm",
        "hover:shadow-md transition-all duration-200",
        styles.hoverBorder,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={cn("p-2 rounded-lg", styles.iconBox)}>
          <Icon className="w-5 h-5" aria-hidden />
        </span>
        <ChevronRight
          className={cn(
            "w-5 h-5 text-muted-foreground shrink-0 transition-all",
            "group-hover:translate-x-0.5",
            styles.hoverChevron,
          )}
          aria-hidden
        />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground transition-colors text-base sm:text-lg",
          styles.hoverTitle,
        )}
      >
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

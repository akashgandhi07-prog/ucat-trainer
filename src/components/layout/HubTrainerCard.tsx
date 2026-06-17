import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export type HubTrainerCardAccent = "primary" | "blue" | "amber" | "emerald" | "violet";

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
  blue: {
    iconBox: "bg-subject-vr/10 text-subject-vr",
    hoverBorder: "hover:border-subject-vr/40",
    hoverTitle: "group-hover:text-subject-vr",
    hoverChevron: "group-hover:text-subject-vr",
  },
  amber: {
    iconBox: "bg-subject-dm/10 text-subject-dm",
    hoverBorder: "hover:border-subject-dm/40",
    hoverTitle: "group-hover:text-subject-dm",
    hoverChevron: "group-hover:text-subject-dm",
  },
  emerald: {
    iconBox: "bg-subject-qr/10 text-subject-qr",
    hoverBorder: "hover:border-subject-qr/40",
    hoverTitle: "group-hover:text-subject-qr",
    hoverChevron: "group-hover:text-subject-qr",
  },
  violet: {
    iconBox: "bg-subject-sjt/10 text-subject-sjt",
    hoverBorder: "hover:border-subject-sjt/40",
    hoverTitle: "group-hover:text-subject-sjt",
    hoverChevron: "group-hover:text-subject-sjt",
  },
};

type HubTrainerCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  accent?: HubTrainerCardAccent;
  /** Small uppercase label above the title (e.g. benefit line on VR / SJT). */
  eyebrow?: string;
  /** Optional tip box above the CTA (SJT hubs). */
  tip?: string;
  /** When set, shows a primary button instead of chevron-only navigation. */
  ctaLabel?: string;
  /** Highlights the card (e.g. active skill on Verbal Reasoning hub). */
  selected?: boolean;
  badge?: string;
};

export default function HubTrainerCard({
  title,
  description,
  icon: Icon,
  onClick,
  accent = "primary",
  eyebrow,
  tip,
  ctaLabel,
  selected = false,
  badge,
}: HubTrainerCardProps) {
  const styles = accentStyles[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col items-stretch text-left rounded-xl border bg-card",
        "p-5 sm:p-6 transition-all duration-200",
        selected
          ? "border-primary bg-training-active-muted shadow-md ring-1 ring-primary/20"
          : cn(
              "border-border shadow-card hover:-translate-y-0.5 hover:shadow-card-hover",
              styles.hoverBorder,
            ),
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={cn(
            "rounded-xl p-2.5 transition-colors",
            selected ? "bg-primary text-primary-foreground" : styles.iconBox,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {badge}
            </span>
          ) : null}
          {!ctaLabel ? (
            <ChevronRight
              className={cn(
                "h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-0.5",
                selected ? "text-primary" : styles.hoverChevron,
              )}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {eyebrow ? (
        <span
          className={cn(
            "mb-2 text-[10px] font-bold uppercase tracking-widest",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {eyebrow}
        </span>
      ) : null}

      <h3
        className={cn(
          "text-base font-semibold text-foreground sm:text-lg",
          !selected && styles.hoverTitle,
          selected && "text-primary",
        )}
      >
        {title}
      </h3>
      <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {tip ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <p className="text-xs leading-relaxed text-muted-foreground">{tip}</p>
        </div>
      ) : null}

      {ctaLabel ? (
        <span className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
          {ctaLabel}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      ) : null}

      {selected && !ctaLabel ? (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}

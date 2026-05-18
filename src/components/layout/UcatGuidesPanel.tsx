import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronDown,
  GraduationCap,
  Heart,
  Layers,
  Scale,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UcatGuide } from "../../data/ucatGuides";
import {
  UCAT_GUIDES_HUB_URL,
  UCAT_GUIDES_MARKETING,
  UCAT_GUIDES_YEAR,
  getOrderedGuideCatalogSections,
  getCatalogSectionIdForTrainingType,
  getCatalogSectionIdForPanelContext,
  getGuidesPanelCopy,
  type UcatGuidesPanelContext,
} from "../../data/ucatGuides";
import type { TrainingType } from "../../types/training";
import { cn } from "../../lib/cn";

const EXTERNAL_LINK_PROPS = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

/** Visual identity per catalogue section: icon tile, open-state stripe, panel wash. */
const CATALOG_SECTION_STYLE: Record<
  string,
  {
    Icon: LucideIcon;
    iconWrap: string;
    headerBg: string;
    headerHover: string;
    stripe: string;
    panelWash: string;
    tileAccent: string;
  }
> = {
  essentials: {
    Icon: Layers,
    iconWrap:
      "border-sky-200/90 bg-sky-50 text-sky-800 shadow-sm shadow-sky-900/5 dark:border-sky-800/40 dark:bg-sky-950/50 dark:text-sky-200",
    headerBg: "bg-sky-50",
    headerHover: "hover:bg-sky-100/90",
    stripe: "bg-gradient-to-b from-sky-500 to-sky-600",
    panelWash: "from-sky-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-sky-500/90",
  },
  verbal: {
    Icon: BookOpen,
    iconWrap:
      "border-blue-200/90 bg-blue-50 text-blue-800 shadow-sm shadow-blue-900/5 dark:border-blue-800/40 dark:bg-blue-950/50 dark:text-blue-200",
    headerBg: "bg-blue-50",
    headerHover: "hover:bg-blue-100/90",
    stripe: "bg-gradient-to-b from-blue-500 to-blue-600",
    panelWash: "from-blue-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-blue-500/90",
  },
  decision: {
    Icon: Scale,
    iconWrap:
      "border-amber-200/90 bg-amber-50 text-amber-900 shadow-sm shadow-amber-900/5 dark:border-amber-800/40 dark:bg-amber-950/50 dark:text-amber-100",
    headerBg: "bg-amber-50",
    headerHover: "hover:bg-amber-100/90",
    stripe: "bg-gradient-to-b from-amber-500 to-amber-600",
    panelWash: "from-amber-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-amber-500/90",
  },
  quant: {
    Icon: Calculator,
    iconWrap:
      "border-emerald-200/90 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5 dark:border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-100",
    headerBg: "bg-emerald-50",
    headerHover: "hover:bg-emerald-100/90",
    stripe: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    panelWash: "from-emerald-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-emerald-500/90",
  },
  sjt: {
    Icon: Heart,
    iconWrap:
      "border-rose-200/90 bg-rose-50 text-rose-900 shadow-sm shadow-rose-900/5 dark:border-rose-800/40 dark:bg-rose-950/50 dark:text-rose-100",
    headerBg: "bg-rose-50",
    headerHover: "hover:bg-rose-100/90",
    stripe: "bg-gradient-to-b from-rose-500 to-rose-600",
    panelWash: "from-rose-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-rose-500/90",
  },
  application: {
    Icon: GraduationCap,
    iconWrap:
      "border-violet-200/90 bg-violet-50 text-violet-900 shadow-sm shadow-violet-900/5 dark:border-violet-800/40 dark:bg-violet-950/50 dark:text-violet-100",
    headerBg: "bg-violet-50",
    headerHover: "hover:bg-violet-100/90",
    stripe: "bg-gradient-to-b from-violet-500 to-violet-600",
    panelWash: "from-violet-500/[0.07] via-transparent to-transparent",
    tileAccent: "border-t-[3px] border-t-violet-500/90",
  },
};

const DEFAULT_SECTION_STYLE = {
  Icon: BookOpen,
  iconWrap: "border-border bg-muted/60 text-foreground",
  headerBg: "bg-muted",
  headerHover: "hover:bg-muted/80",
  stripe: "bg-primary",
  panelWash: "from-primary/[0.06] via-transparent to-transparent",
  tileAccent: "border-t-[3px] border-t-primary/80",
};

type UcatGuidesPanelProps = {
  /** Flat list used when `compact` (sidebar) layout only. Omit on hub pages that use the full catalog. */
  guides?: UcatGuide[];
  /** Picks title and description tuned for the page. */
  context?: UcatGuidesPanelContext;
  title?: string;
  description?: string;
  /** When set with `context="trainer"`, opens that catalogue section first. */
  trainingType?: TrainingType;
  /** When true, parent layout already provides horizontal padding. */
  embedded?: boolean;
  /** Tighter layout for sidebars (e.g. calculator stats column). Uses a flat grid, not the accordion. */
  compact?: boolean;
  /** Match trainer column above (e.g. `max-w-6xl mx-auto w-full`). */
  contentMaxWidthClass?: string;
  className?: string;
};

function GuideTile({
  item,
  compact,
  catalogTileAccentClass,
}: {
  item: UcatGuide;
  compact: boolean;
  /** Top accent when shown inside catalogue grid */
  catalogTileAccentClass?: string;
}) {
  return (
    <li className="flex min-w-0 flex-col">
      <a
        href={item.href}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-background",
          "shadow-[0_1px_3px_0_rgb(0_0_0/0.05),0_1px_2px_-1px_rgb(0_0_0/0.04)]",
          "transition-[transform,box-shadow,border-color] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:border-border hover:shadow-[0_4px_16px_0_rgb(0_0_0/0.08),0_2px_6px_-2px_rgb(0_0_0/0.05)]",
          "active:translate-y-0",
          "motion-reduce:hover:translate-y-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          catalogTileAccentClass,
          compact ? "p-3" : "p-4",
        )}
        {...EXTERNAL_LINK_PROPS}
      >
        <p
          className={cn(
            "flex-1 font-semibold leading-snug text-foreground transition-colors duration-150 group-hover:text-primary",
            compact ? "line-clamp-3 text-xs" : "line-clamp-3 text-sm",
          )}
        >
          {item.title}
        </p>
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-t border-border/40",
            compact ? "mt-2.5 pt-2" : "mt-3 pt-2.5",
          )}
        >
          <span
            className={cn(
              "font-medium text-primary transition-colors duration-150",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            {UCAT_GUIDES_MARKETING.linkCta}
          </span>
          <ArrowUpRight
            className={cn(
              "shrink-0 text-muted-foreground/40 transition-all duration-150 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
              compact ? "h-3 w-3" : "h-3.5 w-3.5",
            )}
            aria-hidden
          />
        </div>
      </a>
    </li>
  );
}

export default function UcatGuidesPanel({
  guides = [],
  context,
  title: titleProp,
  description: descriptionProp,
  trainingType,
  embedded = false,
  compact = false,
  contentMaxWidthClass,
  className,
}: UcatGuidesPanelProps) {
  const catalogMode = !compact;

  const defaults = getGuidesPanelCopy(context);
  const title = titleProp ?? defaults.title;
  const description = descriptionProp ?? defaults.description;
  const rowX = compact ? "px-3.5" : "px-4 sm:px-5";
  const gridPad = compact ? "px-3.5 pb-3 pt-2" : "px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-3.5";
  /** Hub / accordion: auto-fill uses full panel width; avoids a lone card on row two when a section has few guides. */
  const catalogTileGrid =
    "grid list-none grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] lg:gap-4";
  /** Sidebar / compact: parent is already narrow; two columns still work with smaller type. */
  const compactTileGrid =
    "grid list-none grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 lg:gap-4";

  const initialSection =
    context === "trainer" && trainingType
      ? getCatalogSectionIdForTrainingType(trainingType)
      : getCatalogSectionIdForPanelContext(context);

  const catalogSections = useMemo(
    () =>
      getOrderedGuideCatalogSections({
        context,
        trainingType,
      }),
    [context, trainingType],
  );

  const [openSectionId, setOpenSectionId] = useState(initialSection);

  useEffect(() => {
    setOpenSectionId(initialSection);
  }, [initialSection]);

  if (!catalogMode && guides.length === 0) return null;

  return (
    <aside
      className={cn(
        compact ? "mt-4" : "mt-8 sm:mt-10",
        embedded ? undefined : "px-4 sm:px-6 lg:px-8",
        className,
      )}
      aria-label={title}
    >
      <div className={cn(contentMaxWidthClass ?? "w-full")}>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md",
            "ring-1 ring-primary/10",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-amber-500/[0.05]"
            aria-hidden
          />

          <div
            className={cn(
              "relative border-b border-border bg-muted",
              rowX,
              compact ? "py-3.5" : "py-4 sm:py-5",
            )}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide",
                  "border border-amber-500/25 bg-amber-500/15 text-amber-800",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
                )}
              >
                <Sparkles className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} aria-hidden />
                {UCAT_GUIDES_MARKETING.badge}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full font-medium",
                  "border border-primary/15 bg-primary/10 text-primary",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
                )}
              >
                Free · {UCAT_GUIDES_YEAR} cycle
              </span>
            </div>

            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm",
                  compact ? "p-2" : "p-2.5",
                )}
                aria-hidden
              >
                <BookOpen className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  className={cn(
                    "font-bold leading-snug text-foreground",
                    compact ? "text-sm" : "text-base sm:text-lg",
                  )}
                >
                  {title}
                </h2>
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed text-muted-foreground",
                    compact ? "text-xs" : "text-xs sm:text-sm",
                  )}
                >
                  {description}
                </p>
              </div>
            </div>
          </div>

          {catalogMode ? (
            <div className={cn("relative space-y-3", gridPad)} role="region" aria-label="Guide categories">
              {catalogSections.map((section) => {
                const isOpen = openSectionId === section.id;
                const count = section.guides.length;
                const ui = CATALOG_SECTION_STYLE[section.id] ?? DEFAULT_SECTION_STYLE;
                const { Icon: SectionIcon, iconWrap, headerBg, headerHover, stripe, panelWash, tileAccent } =
                  ui;
                return (
                  <div
                    key={section.id}
                    className={cn(
                      "relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm",
                      "ring-1 ring-black/[0.03] transition-[box-shadow,background-color] duration-200 dark:bg-card/50 dark:ring-white/[0.04]",
                      isOpen && "shadow-md ring-primary/10",
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] opacity-0 transition-opacity duration-200",
                        stripe,
                        isOpen && "opacity-100",
                      )}
                      aria-hidden
                    />
                    <button
                      type="button"
                      id={`ucat-guides-trigger-${section.id}`}
                      className={cn(
                        "group/trigger relative flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors sm:gap-4 sm:px-4 sm:py-4",
                        "rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                        headerBg,
                        headerHover,
                        isOpen && "border-b border-border",
                      )}
                      aria-expanded={isOpen}
                      aria-controls={`ucat-guides-panel-${section.id}`}
                      onClick={() => setOpenSectionId((prev) => (prev === section.id ? "" : section.id))}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11",
                          iconWrap,
                        )}
                        aria-hidden
                      >
                        <SectionIcon className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1 pr-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-foreground sm:text-[1.02rem]">{section.title}</span>
                          <span className="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                            {count} guide{count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                          {section.summary}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-sm transition-all duration-200",
                          "group-hover/trigger:border-primary/25 group-hover/trigger:bg-background",
                          isOpen && "rotate-0 border-primary/20 bg-muted/60 text-foreground",
                        )}
                      >
                        <ChevronDown
                          className={cn("h-5 w-5 transition-transform duration-[350ms] ease-out", isOpen && "rotate-180")}
                          aria-hidden
                        />
                      </span>
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-[350ms] ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div
                          id={`ucat-guides-panel-${section.id}`}
                          role="region"
                          aria-labelledby={`ucat-guides-trigger-${section.id}`}
                          className={cn(
                            "relative border-t border-border bg-gradient-to-b bg-card px-3 py-4 sm:px-5 sm:py-5",
                            panelWash,
                          )}
                        >
                          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:mb-4">
                            Free to read on our site · opens in a new tab
                          </p>
                          <ul className={catalogTileGrid}>
                            {section.guides.map((item) => (
                              <GuideTile
                                key={item.id}
                                item={item}
                                compact={false}
                                catalogTileAccentClass={tileAccent}
                              />
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className={cn("relative m-0 p-0", gridPad, compactTileGrid)}>
              {guides.map((item) => (
                <GuideTile key={item.id} item={item} compact={compact} />
              ))}
            </ul>
          )}

          <div
            className={cn(
              "relative border-t border-border bg-muted/35",
              rowX,
              compact ? "py-2.5" : "py-3.5 sm:py-4",
            )}
          >
            <a
              href={UCAT_GUIDES_HUB_URL}
              className={cn(
                "group/footer inline-flex items-center gap-2 rounded-xl font-semibold text-primary transition-colors",
                "underline-offset-[0.22em] hover:underline hover:text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-muted/35",
                compact
                  ? "text-xs"
                  : "border border-primary/15 bg-primary/[0.06] px-3.5 py-2 text-sm shadow-sm hover:border-primary/25 hover:bg-primary/10",
              )}
              {...EXTERNAL_LINK_PROPS}
            >
              {UCAT_GUIDES_MARKETING.footerCta}
              <ArrowUpRight
                className={cn(
                  "transition-transform duration-200 group-hover/footer:translate-x-0.5 group-hover/footer:-translate-y-0.5",
                  compact ? "h-3.5 w-3.5" : "h-4 w-4",
                )}
                aria-hidden
              />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

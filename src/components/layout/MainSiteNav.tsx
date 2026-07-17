/**
 * Mega-menu navigation linking to the main theukcatpeople.co.uk site.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/cn";

const BASE = "https://www.theukcatpeople.co.uk";

type MenuItem = {
  label: string;
  href: string;
  description?: string;
  badge?: string;
  badgeColor?: "green" | "amber" | "blue" | "rose";
};
type MenuGroup = { heading?: string; items: MenuItem[] };
type NavItem =
  | { label: string; href: string; groups?: undefined }
  | { label: string; href?: undefined; groups: MenuGroup[] };

const MAIN_NAV: NavItem[] = [
  {
    label: "Full Packages",
    groups: [
      {
        items: [
          {
            label: "Medicine Ultimate Package",
            href: `${BASE}/ultimate-package`,
            description: "UCAT tutoring, PS review & interview prep",
          },
          {
            label: "Dentistry Application Package",
            href: `${BASE}/dentistry-application-packages`,
            description: "End-to-end dentistry application support",
          },
        ],
      },
    ],
  },
  {
    label: "UCAT",
    groups: [
      {
        heading: "Tutoring & Courses",
        items: [
          {
            label: "UCAT 1-1 Tutoring",
            href: `${BASE}/ucat-tutoring`,
            description: "Personalised sessions with an expert tutor",
          },
          {
            label: "UCAT Schools Course",
            href: `${BASE}/ucat-course-schools`,
            description: "We come to your school",
          },
        ],
      },
      {
        heading: "Free",
        items: [
          {
            label: "Free Strategy Consultation",
            href: `${BASE}/free-strategy-consultation`,
            description: "15-min call to discuss tutoring packages",
            badge: "Free",
            badgeColor: "blue",
          },
        ],
      },
    ],
  },
  {
    label: "Personal Statement",
    groups: [
      {
        items: [
          {
            label: "Medicine PS Reviews",
            href: `${BASE}/personal-statement-medicine`,
            description: "Expert feedback, fast turnaround",
            badge: "From £149",
            badgeColor: "rose",
          },
          {
            label: "Dentistry PS Reviews",
            href: `${BASE}/dentistry-personal-statement`,
            description: "Specialist dental school guidance",
            badge: "From £149",
            badgeColor: "rose",
          },
        ],
      },
    ],
  },
  {
    label: "Interview Prep",
    groups: [
      {
        items: [
          {
            label: "Medicine Interview Tutoring",
            href: `${BASE}/medicine-interview-tutor-coaching`,
            description: "MMI, panel & Oxbridge formats",
          },
          {
            label: "Dentistry Interview Tutoring",
            href: `${BASE}/dentistry-interview-coaching`,
            description: "All dental school interview styles",
          },
          {
            label: "Oxbridge Medicine Programme",
            href: `${BASE}/oxbridge-medicine-mentoring-tutoring-programme`,
            description: "Specialist Oxford & Cambridge support",
          },
        ],
      },
    ],
  },
  {
    label: "Free Guides",
    groups: [
      {
        items: [
          {
            label: "Application Guide",
            href: `${BASE}/application-guide`,
            description: "Step-by-step admissions walkthrough",
            badge: "Free",
            badgeColor: "blue",
          },
          {
            label: "UCAT Score Calculator 2026",
            href: `${BASE}/application-guide/ucat/ucat-score-calculator`,
            description: "Convert raw marks to scaled scores",
            badge: "Free",
            badgeColor: "blue",
          },
          {
            label: "UCAT Cut Offs 2026",
            href: `${BASE}/medical-schools/ucat/how-universities-use-the-ucat`,
            description: "Score thresholds for every medical school",
          },
          {
            label: "UK Dental Schools Guide",
            href: `${BASE}/guide/dental-school/dentistry-university-uk`,
            description: "Rankings, entry requirements & tips",
          },
        ],
      },
    ],
  },
  { label: "Blog", href: `${BASE}/blog` },
];

const BADGE_STYLES: Record<NonNullable<MenuItem["badgeColor"]>, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

type PanelPos = { top: number; centerX: number };

function DropdownPanel({
  groups,
  pos,
  onMouseEnter,
  onMouseLeave,
}: {
  groups: MenuGroup[];
  pos: PanelPos;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const multiCol = groups.length > 1;
  const panelRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const margin = 8;
    if (rect.left < margin) setOffset(margin - rect.left);
    else if (rect.right > window.innerWidth - margin) setOffset(window.innerWidth - margin - rect.right);
    else setOffset(0);
  }, [pos]);

  const panel = (
    <div
      ref={panelRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "fixed z-[9999] overflow-hidden rounded-2xl",
        "bg-white ring-1 ring-slate-900/8",
        "shadow-[0_8px_30px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)]",
        multiCol ? "grid" : "min-w-[260px]",
      )}
      style={{
        top: pos.top + 6,
        left: pos.centerX,
        transform: `translateX(calc(-50% + ${offset}px))`,
        ...(multiCol
          ? { gridTemplateColumns: `repeat(${groups.length}, minmax(220px, 1fr))` }
          : {}),
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-primary/70 to-primary/30"
        style={{ gridColumn: multiCol ? `1 / -1` : undefined }}
      />

      {groups.map((group, gi) => (
        <div
          key={gi}
          className={cn(
            "pt-5 pb-3 px-3",
            gi > 0 && "border-l border-border",
          )}
        >
          {group.heading && (
            <div className="flex items-center gap-1.5 mb-2 px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                {group.heading}
              </p>
            </div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-start justify-between gap-3 rounded-xl px-2.5 py-2.5",
                    "transition-all duration-150",
                    "hover:bg-secondary border border-transparent hover:border-border/80",
                  )}
                >
                  <div className="min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {item.label}
                    </span>
                    {item.description && (
                      <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {item.description}
                      </span>
                    )}
                    {item.badge && (
                      <span
                        className={cn(
                          "mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                          BADGE_STYLES[item.badgeColor ?? "blue"],
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <ArrowUpRight
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-300 group-hover:text-primary transition-colors"
                    aria-hidden
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return createPortal(panel, document.body);
}

function NavButton({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos>({ top: 56, centerX: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enter = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom, centerX: rect.left + rect.width / 2 });
    }
    setOpen(true);
  }, []);

  const leave = useCallback(() => {
    timer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!item.groups) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-secondary transition-colors whitespace-nowrap"
      >
        {item.label}
      </a>
    );
  }

  return (
    <div ref={containerRef} onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-0.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap",
          open
            ? "text-primary bg-primary/5"
            : "text-muted-foreground hover:text-primary hover:bg-secondary",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn(
            "w-3 h-3 mt-px shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <DropdownPanel
          groups={item.groups}
          pos={pos}
          onMouseEnter={enter}
          onMouseLeave={leave}
        />
      )}
    </div>
  );
}

export function MainSiteNavBar() {
  return (
    <nav className="flex items-center gap-0.5" aria-label="Main site navigation">
      {MAIN_NAV.map((item) => (
        <NavButton key={item.label} item={item} />
      ))}
    </nav>
  );
}

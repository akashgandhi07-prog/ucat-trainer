/**
 * Mega-menu navigation linking to the main theukcatpeople.co.uk site.
 * Rendered inside AppTopBar (desktop) and the AppShell mobile drawer header.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

const BASE = "https://www.theukcatpeople.co.uk";

export type MenuItem = { label: string; href: string; description?: string };
export type MenuGroup = { heading?: string; items: MenuItem[] };
export type NavItem =
  | { label: string; href: string; groups?: undefined }
  | { label: string; href?: undefined; groups: MenuGroup[] };

export const MAIN_NAV: NavItem[] = [
  {
    label: "Full Packages",
    groups: [
      {
        items: [
          { label: "Medicine Ultimate Package", href: `${BASE}/ultimate-package`, description: "End-to-end medicine application support" },
          { label: "Dentistry Application Package", href: `${BASE}/dentistry-application-packages`, description: "Complete dentistry bundle" },
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
          { label: "UCAT 1-1 Tutoring", href: `${BASE}/ucat-tutoring`, description: "Personalised tutor sessions" },
          { label: "UCAT 1 Day Course", href: `${BASE}/ucat-courses`, description: "Intensive group course" },
          { label: "UCAT Schools Course", href: `${BASE}/ucat-course-schools`, description: "Delivered in your school" },
        ],
      },
      {
        heading: "Free Resources",
        items: [
          { label: "Free Practice Questions", href: `${BASE}/ukcattuition-free-practice-questions`, description: "Official-style question bank" },
          { label: "Free Strategy Consultation", href: `${BASE}/free-strategy-consultation`, description: "30-min expert call" },
        ],
      },
    ],
  },
  {
    label: "Personal Statement",
    groups: [
      {
        items: [
          { label: "Medicine PS Reviews", href: `${BASE}/personal-statement-medicine`, description: "From £149" },
          { label: "Dentistry PS Reviews", href: `${BASE}/dentistry-personal-statement`, description: "From £149" },
          { label: "Medicine & Dentistry PS", href: `${BASE}/personal-statement-medicine-dentist`, description: "From £149" },
        ],
      },
    ],
  },
  {
    label: "Interview Prep",
    groups: [
      {
        items: [
          { label: "Medicine Interview Tutoring", href: `${BASE}/medicine-interview-tutor-coaching`, description: "MMI, panel & Oxbridge prep" },
          { label: "Dentistry Interview Tutoring", href: `${BASE}/dentistry-interview-coaching`, description: "All dental school formats" },
          { label: "Oxbridge Medicine Programme", href: `${BASE}/oxbridge-medicine-mentoring-tutoring-programme`, description: "Specialist Oxbridge support" },
        ],
      },
    ],
  },
  {
    label: "Free Guides",
    groups: [
      {
        items: [
          { label: "Application Guide", href: `${BASE}/application-guide`, description: "Step-by-step admissions guide" },
          { label: "How Universities Use UCAT", href: `${BASE}/medical-schools/ucat/how-universities-use-the-ucat`, description: "Threshold data by school" },
          { label: "UK Dental Schools Guide", href: `${BASE}/guide/dental-school/dentistry-university-uk`, description: "Rankings, entry reqs & tips" },
        ],
      },
    ],
  },
  { label: "Blog", href: `${BASE}/blog` },
];

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

  const panel = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100/80 p-4",
        multiCol ? "grid gap-x-5" : "min-w-[220px]",
      )}
      style={{
        top: pos.top + 8,
        left: pos.centerX,
        transform: "translateX(-50%)",
        ...(multiCol ? { gridTemplateColumns: `repeat(${groups.length}, minmax(190px, 1fr))` } : {}),
      }}
    >
      {/* Caret */}
      <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l border-t border-slate-100/80 rotate-45" />

      {groups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "border-l border-slate-100 pl-5" : ""}>
          {group.heading && (
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 px-2">
              {group.heading}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl px-2.5 py-2 hover:bg-slate-50 transition-colors group"
                >
                  <span className="block text-[13px] font-medium text-slate-800 group-hover:text-primary transition-colors leading-tight">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  )}
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
    timer.current = setTimeout(() => setOpen(false), 100);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!item.groups) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center px-2.5 py-1.5 text-[13px] font-medium text-slate-600 hover:text-primary rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
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
          open ? "text-primary bg-primary/5" : "text-slate-600 hover:text-primary hover:bg-slate-50",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn("w-3 h-3 mt-px shrink-0 transition-transform duration-200", open && "rotate-180")}
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

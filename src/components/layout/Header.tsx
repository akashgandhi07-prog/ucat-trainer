import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useAuthModal } from "../../contexts/AuthModalContext";
import { useBugReportModal } from "../../contexts/BugReportContext";
import { useAppShell } from "../../contexts/AppShellContext";
import { cn } from "../../lib/cn";

const BASE = "https://www.theukcatpeople.co.uk";

type MenuItem = { label: string; href: string; description?: string };
type MenuGroup = { heading?: string; items: MenuItem[] };

type NavItem =
  | { label: string; href: string; groups?: undefined }
  | { label: string; href?: undefined; groups: MenuGroup[] };

const NAV: NavItem[] = [
  {
    label: "Full Packages",
    groups: [
      {
        items: [
          { label: "All Packages", href: `${BASE}/packages`, description: "View everything we offer" },
          { label: "Medicine Ultimate Package", href: `${BASE}/ultimate-package`, description: "End-to-end medicine application support" },
          { label: "Dentistry Application Package", href: `${BASE}/dentistry-application-packages`, description: "Complete dentistry application bundle" },
          { label: "Veterinary Ultimate Package", href: `${BASE}/veterinary-medicine-ultimate-package`, description: "Tailored vet school package" },
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
          { label: "UCAT & BMAT Tutors", href: `${BASE}/ucat-bmat-tutors`, description: "Expert specialist tutors" },
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
        heading: "Medicine & Dentistry",
        items: [
          { label: "Medicine PS Reviews", href: `${BASE}/personal-statement-medicine` },
          { label: "Dentistry PS Reviews", href: `${BASE}/dentistry-personal-statement` },
          { label: "Medicine & Dentistry PS", href: `${BASE}/personal-statement-medicine-dentist` },
        ],
      },
      {
        heading: "Allied Health",
        items: [
          { label: "Veterinary PS Reviews", href: `${BASE}/vet-school-personal-statement` },
          { label: "Pharmacy PS Reviews", href: `${BASE}/pharmacy-personal-statement` },
          { label: "Dental Hygiene & Therapy PS", href: `${BASE}/dental-hygiene-and-therapy-personal-statement` },
          { label: "Physiotherapy PS Reviews", href: `${BASE}/physiotherapy-personal-statement-reviews` },
          { label: "Occupational Therapy PS", href: `${BASE}/occupational-therapy-personal-statement` },
        ],
      },
    ],
  },
  {
    label: "Interview Tutoring",
    groups: [
      {
        items: [
          { label: "Medicine Interview Tutoring", href: `${BASE}/medicine-interview-tutor-coaching`, description: "MMI, panel & Oxbridge prep" },
          { label: "Dentistry Interview Tutoring", href: `${BASE}/dentistry-interview-coaching`, description: "All dental school formats" },
          { label: "Vet School Interview Coaching", href: `${BASE}/vet-school-interview-coaching`, description: "MAT & general interview prep" },
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
          { label: "Free BMAT Past Papers", href: `${BASE}/free-bmat-past-papers-solutions`, description: "Full papers & worked solutions" },
          { label: "How Universities Use UCAT", href: `${BASE}/medical-schools/ucat/how-universities-use-the-ucat`, description: "Threshold data by school" },
          { label: "UK Dental Schools Guide", href: `${BASE}/guide/dental-school/dentistry-university-uk`, description: "Rankings, entry reqs & tips" },
          { label: "UK Vet Schools Guide", href: `${BASE}/guide/vet-schools-uk`, description: "Every vet school compared" },
        ],
      },
    ],
  },
  {
    label: "Other",
    groups: [
      {
        heading: "Specialist Services",
        items: [
          { label: "BMAT Tutoring", href: `${BASE}/bmat-tutoring` },
          { label: "BMAT Courses", href: `${BASE}/bmat-courses` },
          { label: "GAMSAT Tutors", href: `${BASE}/gamsat-tutors` },
        ],
      },
      {
        heading: "Company",
        items: [
          { label: "Reviews", href: `${BASE}/reviews` },
          { label: "Join Our Team", href: `${BASE}/join-our-team` },
          { label: "Contact Us", href: `${BASE}/theukcatpeople-contact-us` },
        ],
      },
    ],
  },
  { label: "Blog", href: `${BASE}/blog` },
];

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function DropdownMenu({ groups }: { groups: MenuGroup[] }) {
  const multiCol = groups.length > 1;
  return (
    <div
      className={cn(
        "absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-2xl shadow-xl border border-border p-4 z-50 min-w-[220px]",
        multiCol ? "grid gap-x-6" : "",
      )}
      style={multiCol ? { gridTemplateColumns: `repeat(${groups.length}, minmax(180px, 1fr))` } : undefined}
    >
      {groups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "border-l border-border pl-6" : ""}>
          {group.heading && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
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
                  className="block rounded-xl px-3 py-2 hover:bg-secondary transition-colors group"
                >
                  <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground mt-0.5 leading-tight">{item.description}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NavItemButton({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, []);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  if (!item.groups) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-center gap-0.5 px-3 py-2 text-sm font-medium text-foreground hover:text-primary rounded-lg hover:bg-secondary transition-colors whitespace-nowrap"
      >
        {item.label}
      </a>
    );
  }

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          "relative flex items-center gap-0.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
          open ? "text-primary bg-primary/5" : "text-foreground hover:text-primary hover:bg-secondary",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn("w-3.5 h-3.5 mt-px shrink-0 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "transition-all duration-200 origin-top",
          open ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none",
        )}
      >
        <DropdownMenu groups={item.groups} />
      </div>
    </div>
  );
}

export default function Header() {
  const inAppShell = useAppShell();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading, sessionLoadFailed, retryGetSession, signOut } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openBugReport } = useBugReportModal();

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string)?.trim() ||
    (user?.user_metadata?.name as string)?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    null;

  const showSessionRecovery = !loading && !user && sessionLoadFailed;

  if (inAppShell) return null;

  return (
    <header className="border-b border-border/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      {showSessionRecovery && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 flex-wrap text-sm text-amber-900">
          <span>Having trouble connecting?</span>
          <button
            type="button"
            onClick={retryGetSession}
            className="font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded px-1"
          >
            Retry
          </button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex items-center h-14 gap-3">
        {/* Logo */}
        <Link
          to="/"
          className="shrink-0 flex items-center gap-2 mr-2"
        >
          <span className="text-base font-bold tracking-tight text-foreground">
            TheUKCATPeople
          </span>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
            Free Trainer
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1">
          {NAV.map((item) => (
            <NavItemButton key={item.label} item={item} />
          ))}
        </nav>

        {/* Spacer */}
        <div className="hidden lg:block flex-1" />

        {/* Trainer links */}
        <div className="hidden sm:flex items-center gap-1 border-l border-border pl-3 ml-1">
          <Link
            to="/dashboard"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors whitespace-nowrap"
          >
            My progress
          </Link>
          <button
            type="button"
            onClick={() => openBugReport()}
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
          >
            Feedback
          </button>
          {isAdmin && (
            <Link
              to="/admin"
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary rounded-lg transition-colors"
            >
              Admin
            </Link>
          )}
        </div>

        {/* Auth */}
        <div className="hidden sm:flex items-center gap-2 pl-3">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground font-medium max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                type="button"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  await signOut();
                  navigate("/");
                }}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="px-3 py-1.5 text-sm font-semibold text-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-4 py-1.5 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden ml-auto p-2 -mr-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <MenuIcon open={mobileMenuOpen} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-white shadow-lg max-h-[80vh] overflow-y-auto">
          <nav className="px-4 py-3 space-y-1">
            {NAV.map((item) =>
              !item.groups ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <div key={item.label}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                    onClick={() =>
                      setMobileExpanded((v) => (v === item.label ? null : item.label))
                    }
                    aria-expanded={mobileExpanded === item.label}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        mobileExpanded === item.label && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {mobileExpanded === item.label && (
                    <div className="mt-1 ml-2 pl-3 border-l-2 border-border space-y-3 pb-2">
                      {item.groups.map((group, gi) => (
                        <div key={gi}>
                          {group.heading && (
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 px-1">
                              {group.heading}
                            </p>
                          )}
                          {group.items.map((link) => (
                            <a
                              key={link.href}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            <div className="border-t border-border pt-3 mt-2 space-y-1">
              <Link
                to="/dashboard"
                className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                My progress
              </Link>
              <button
                type="button"
                onClick={() => { openBugReport(); setMobileMenuOpen(false); }}
                className="w-full text-left flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors"
              >
                Feedback
              </button>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </div>

            <div className="border-t border-border pt-3 mt-2 flex gap-2">
              {user ? (
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    setSigningOut(true);
                    await signOut();
                    navigate("/");
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-foreground border border-border rounded-xl hover:bg-secondary disabled:opacity-50 transition-colors"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { openAuthModal("register"); setMobileMenuOpen(false); }}
                    className="flex-1 py-2.5 text-sm font-semibold text-foreground border border-border rounded-xl hover:bg-secondary transition-colors"
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => { openAuthModal("login"); setMobileMenuOpen(false); }}
                    className="flex-1 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

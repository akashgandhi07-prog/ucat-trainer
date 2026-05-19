import type { ReactNode } from "react";
import { BookOpen, CalendarDays, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { UNIFIED_LOGIN_MESSAGING_ENABLED, isPlannerIntegrated } from "../../lib/plannerUrl";

function HubCard({
  title,
  description,
  href,
  external,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon: ReactNode;
}) {
  const className =
    "group flex flex-col rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all text-left h-full";

  const inner = (
    <>
      <div className="mb-3 p-2.5 rounded-full bg-primary/10 text-primary w-fit">{icon}</div>
      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground leading-snug flex-1">{description}</p>
      <span className="mt-3 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Open &rarr;
      </span>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      {inner}
    </Link>
  );
}

export default function UnifiedProductHub() {
  if (!isPlannerIntegrated()) return null;

  return (
    <section className="mb-8" aria-labelledby="unified-hub-heading">
      <h2 id="unified-hub-heading" className="text-lg font-semibold text-foreground mb-1">
        Planning & progress
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {UNIFIED_LOGIN_MESSAGING_ENABLED
          ? "One free account: skills drills, a generated study plan, and mock score tracking. No subscription required."
          : "Free study plan and mock score tracking. Sign in on each tool when you want to save progress."}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HubCard
          title="Free skills trainers"
          description="Speed reading, syllogisms, mental maths, and more. Always free."
          href="/"
          icon={<BookOpen className="w-6 h-6" aria-hidden />}
        />
        <HubCard
          title="Free study plan"
          description="Personalised timetable and daily revision slots at no cost."
          href="/study-plan"
          icon={<CalendarDays className="w-6 h-6" aria-hidden />}
        />
        <HubCard
          title="Free mock tracking"
          description="Log Medify, official, and other mock results. Free to use."
          href="/mock-scores"
          icon={<LineChart className="w-6 h-6" aria-hidden />}
        />
      </div>
    </section>
  );
}

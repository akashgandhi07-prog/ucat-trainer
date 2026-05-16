import { ExternalLink } from "lucide-react";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import type { GMCDomainId } from "../../types/sjt";
import { cn } from "../../lib/cn";

const colorClasses: Record<string, { badge: string; dot: string }> = {
  blue: {
    badge: "bg-blue-50 border-blue-200 text-blue-800",
    dot: "bg-blue-500",
  },
  emerald: {
    badge: "bg-emerald-50 border-emerald-200 text-emerald-800",
    dot: "bg-emerald-500",
  },
  amber: {
    badge: "bg-amber-50 border-amber-200 text-amber-800",
    dot: "bg-amber-500",
  },
  purple: {
    badge: "bg-purple-50 border-purple-200 text-purple-800",
    dot: "bg-purple-500",
  },
};

type Props = {
  domain: GMCDomainId;
  showLink?: boolean;
  className?: string;
};

export default function SJTDomainBadge({ domain, showLink = false, className }: Props) {
  const d = GMC_DOMAINS[domain];
  const colors = colorClasses[d.color] ?? colorClasses.blue;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
          colors.badge
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} aria-hidden />
        {d.shortName}
      </span>
      {showLink && (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          aria-label={`Read GMP guidance on ${d.name}`}
        >
          GMP guidance
          <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      )}
    </div>
  );
}

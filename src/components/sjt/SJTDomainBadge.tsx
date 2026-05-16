import { ExternalLink } from "lucide-react";
import { GMC_DOMAINS } from "../../data/gmcDomains";
import type { GMCDomainId } from "../../types/sjt";
import { cn } from "../../lib/cn";

const dotColor: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
};

type Props = {
  domain: GMCDomainId;
  showLink?: boolean;
  className?: string;
};

export default function SJTDomainBadge({ domain, showLink = false, className }: Props) {
  const d = GMC_DOMAINS[domain];
  const dot = dotColor[d.color] ?? dotColor.blue;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-secondary text-foreground">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} aria-hidden />
        {d.shortName}
      </span>
      {showLink && (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          aria-label={`Read GMP guidance on ${d.name}`}
        >
          GMP guidance
          <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      )}
    </div>
  );
}

import { ExternalLink } from "lucide-react";
import type { GmpReference } from "../../types/sjt";

type Props = {
  gmpRef: GmpReference;
  className?: string;
};

export default function SjtGmpGuidanceLink({ gmpRef, className }: Props) {
  return (
    <a
      href={gmpRef.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
      }
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
      GMC Good Medical Practice: {gmpRef.label}
    </a>
  );
}

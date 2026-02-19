import { UCAT_TUTORING_URL, TRUSTPILOT_URL, TUTORING_COPY } from "../../lib/tutoringUpsell";

const EXTERNAL_LINK_PROPS = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

type Variant = "footer" | "inline" | "hub" | "banner" | "postDrill";

type TutoringUpsellProps = {
  variant: Variant;
};

export default function TutoringUpsell({ variant }: TutoringUpsellProps) {
  if (variant === "footer") {
    return (
      <div className="text-center text-sm text-slate-500 mb-2 space-y-1" aria-label="Trust and tutoring info">
        <p>
          {TUTORING_COPY.trustLine}{" "}
          <a
            href={TRUSTPILOT_URL}
            className="text-slate-600 hover:text-blue-600 transition-colors"
            {...EXTERNAL_LINK_PROPS}
          >
            {TUTORING_COPY.ratedTrustpilot}
          </a>
          {" — "}
          <a
            href={UCAT_TUTORING_URL}
            className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
            {...EXTERNAL_LINK_PROPS}
          >
            {TUTORING_COPY.footerCta}
          </a>
          .
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className="text-center text-sm text-muted-foreground mt-6">
        {TUTORING_COPY.expertLine}{" "}
        <a
          href={UCAT_TUTORING_URL}
          className="text-blue-600 hover:underline font-medium"
          {...EXTERNAL_LINK_PROPS}
        >
          {TUTORING_COPY.linkText}
        </a>
        .
      </p>
    );
  }

  if (variant === "hub") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {TUTORING_COPY.expertLine}{" "}
        <a
          href={UCAT_TUTORING_URL}
          className="text-blue-600 hover:underline font-medium"
          {...EXTERNAL_LINK_PROPS}
        >
          {TUTORING_COPY.linkText}
        </a>
        .
      </p>
    );
  }

  if (variant === "banner") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-center">
        <p className="text-sm text-slate-600">
          {TUTORING_COPY.boostScore} —{" "}
          <a
            href={UCAT_TUTORING_URL}
            className="font-medium text-blue-600 hover:underline"
            {...EXTERNAL_LINK_PROPS}
          >
            {TUTORING_COPY.linkTextShort}
          </a>
          .
        </p>
      </div>
    );
  }

  if (variant === "postDrill") {
    return (
      <p className="text-center text-xs text-slate-500 mt-4">
        {TUTORING_COPY.wantExpertTips}{" "}
        <a
          href={UCAT_TUTORING_URL}
          className="text-blue-600 hover:underline"
          {...EXTERNAL_LINK_PROPS}
        >
          {TUTORING_COPY.linkText}
        </a>
        .
      </p>
    );
  }

  return null;
}

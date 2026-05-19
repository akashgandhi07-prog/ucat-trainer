import { useState, useMemo } from "react";
import type { TrainerFaqItem } from "../../data/trainerFaqs";
import { APP_CONTENT_WIDTH_NARROW, APP_CONTENT_X } from "../../lib/appContentLayout";
import { cn } from "../../lib/cn";

type TrainerFaqSectionProps = {
  title?: string;
  intro?: string;
  faqs: TrainerFaqItem[];
  /** Optional ID to ensure stable heading anchors per page */
  id?: string;
  /**
   * When true, wraps all FAQs in a single parent accordion (e.g. "Common questions")
   * so that the whole block is collapsed by default. Used on trainer pages to reduce distraction
   * while keeping content in the DOM for SEO.
   */
  collapseIntoSingleAccordion?: boolean;
  /** When true, parent already provides horizontal padding (e.g. SkillsSectionLayout). */
  embedded?: boolean;
};

/** Build schema.org FAQPage JSON-LD from the same faqs array used for the accordion (stays in sync when you edit trainerFaqs.ts). */
function buildFaqPageSchema(faqs: TrainerFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: item.answer,
      },
    })),
  };
}

export default function TrainerFaqSection({
  title,
  intro,
  faqs,
  id,
  collapseIntoSingleAccordion = false,
  embedded = false,
}: TrainerFaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  const faqSchema = useMemo(() => buildFaqPageSchema(faqs), [faqs]);
  const [groupOpen, setGroupOpen] = useState<boolean>(true);

  if (!faqs.length) return null;

  const renderFaqList = () => (
    <div className="space-y-2 sm:space-y-3">
      {faqs.map((item) => {
        const isOpen = openId === item.id;
        const buttonId = `${id ?? "trainer-faq"}-q-${item.id}`;
        const panelId = `${id ?? "trainer-faq"}-a-${item.id}`;
        return (
          <div
            key={item.id}
            className="border border-border rounded-lg bg-white/60 hover:border-border transition-colors"
          >
            <button
              type="button"
              id={buttonId}
              aria-controls={panelId}
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="w-full flex items-center justify-between text-left px-4 sm:px-5 py-3 sm:py-3.5 gap-3"
            >
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                {item.question}
              </h3>
              <span
                className="inline-flex items-center justify-center rounded-full border border-border text-muted-foreground w-6 h-6 text-xs shrink-0"
                aria-hidden="true"
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-[350ms] ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="px-4 sm:px-5 pb-3 sm:pb-4 text-sm sm:text-base text-foreground"
                >
                  <p className="leading-relaxed">{item.answer}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={cn(
        "mt-12 sm:mt-16 border-t border-border pt-8 sm:pt-10",
        !embedded && APP_CONTENT_X,
      )}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className={embedded ? "w-full" : cn(APP_CONTENT_WIDTH_NARROW, "mx-auto")}>
        {!collapseIntoSingleAccordion && (
          <>
            {title && (
              <h2
                id={id ? `${id}-heading` : undefined}
                className="text-xl sm:text-2xl font-semibold text-foreground mb-2"
              >
                {title}
              </h2>
            )}
            {intro && (
              <p className="text-sm sm:text-base text-muted-foreground mb-5 sm:mb-6">
                {intro}
              </p>
            )}
            {renderFaqList()}
          </>
        )}

        {collapseIntoSingleAccordion && (
          <div className="border border-border rounded-xl bg-white/70">
            <button
              type="button"
              id={id ? `${id}-heading` : undefined}
              aria-controls={id ? `${id}-panel` : undefined}
              aria-expanded={groupOpen}
              onClick={() => setGroupOpen((open) => !open)}
              className="w-full flex items-center justify-between text-left px-4 sm:px-5 py-3.5 sm:py-4 gap-3"
            >
              <div>
                {title && (
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">
                    {title}
                  </h2>
                )}
                {intro && (
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    {intro}
                  </p>
                )}
              </div>
              <span
                className="inline-flex items-center justify-center rounded-full border border-border text-muted-foreground w-7 h-7 text-sm shrink-0"
                aria-hidden="true"
              >
                {groupOpen ? "−" : "+"}
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-[350ms] ease-out"
              style={{ gridTemplateRows: groupOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  id={id ? `${id}-panel` : undefined}
                  role="region"
                  aria-labelledby={id ? `${id}-heading` : undefined}
                  className="border-t border-border px-4 sm:px-5 pb-4 sm:pb-5 pt-3 sm:pt-4"
                >
                  {renderFaqList()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


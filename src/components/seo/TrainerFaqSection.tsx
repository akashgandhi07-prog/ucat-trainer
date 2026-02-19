import { useState, useMemo } from "react";
import type { TrainerFaqItem } from "../../data/trainerFaqs";

type TrainerFaqSectionProps = {
  title?: string;
  intro?: string;
  faqs: TrainerFaqItem[];
  /** Optional ID to ensure stable heading anchors per page */
  id?: string;
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

export default function TrainerFaqSection({ title, intro, faqs, id }: TrainerFaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  const faqSchema = useMemo(() => buildFaqPageSchema(faqs), [faqs]);

  if (!faqs.length) return null;

  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="mt-12 sm:mt-16 border-t border-slate-200 pt-8 sm:pt-10"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {title && (
          <h2
            id={id ? `${id}-heading` : undefined}
            className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2"
          >
            {title}
          </h2>
        )}
        {intro && (
          <p className="text-sm sm:text-base text-slate-600 mb-5 sm:mb-6">
            {intro}
          </p>
        )}
        <div className="space-y-2 sm:space-y-3">
          {faqs.map((item) => {
            const isOpen = openId === item.id;
            const buttonId = `${id ?? "trainer-faq"}-q-${item.id}`;
            const panelId = `${id ?? "trainer-faq"}-a-${item.id}`;
            return (
              <div
                key={item.id}
                className="border border-slate-200 rounded-lg bg-white/60 hover:border-slate-300 transition-colors"
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between text-left px-4 sm:px-5 py-3 sm:py-3.5 gap-3"
                >
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900">
                    {item.question}
                  </h2>
                  <span
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-500 w-6 h-6 text-xs shrink-0"
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={isOpen ? "px-4 sm:px-5 pb-3 sm:pb-4 text-sm sm:text-base text-slate-700" : "hidden"}
                >
                  <p className="leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


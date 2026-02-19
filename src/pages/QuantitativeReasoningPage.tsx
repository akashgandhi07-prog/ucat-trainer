import { useNavigate } from "react-router-dom";
import { Calculator, Brain, ArrowLeft } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import BreadcrumbNav from "../components/layout/BreadcrumbNav";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function QuantitativeReasoningPage() {
  const navigate = useNavigate();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-quantitative-reasoning-practice` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Quantitative Reasoning", url: `${base}/ucat-quantitative-reasoning-practice` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <SEOHead
        title="Quantitative Reasoning | UCAT Trainer"
        description="Calculator and mental maths practice for UCAT Quantitative Reasoning. Master the on-screen calculator and build speed without it."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <main className="flex-1 py-5 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <BreadcrumbNav items={breadcrumbs} />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 mb-4 sm:mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="text-center mb-6 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Quantitative Reasoning</h1>
            <p className="mt-1.5 sm:mt-2 text-muted-foreground text-sm sm:text-base">
              Choose a trainer to build calculator fluency or mental maths speed.
            </p>
            <div className="mt-4">
              <TutoringUpsell variant="hub" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Calculator Trainer */}
            <button
              type="button"
              onClick={() => navigate("/train/calculator")}
              className="group relative flex flex-col items-center p-4 sm:p-6 md:p-8 bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center space-y-3 sm:space-y-5 md:space-y-6"
            >
              <div className="p-3 sm:p-4 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-transform duration-300">
                <Calculator className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  Calculator Trainer
                </h2>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  Master the on-screen calculator and keypad under time pressure.
                </p>
              </div>
              <span className="text-xs sm:text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                Start Training &rarr;
              </span>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-xl sm:rounded-2xl pointer-events-none transition-colors" />
            </button>

            {/* Mental Maths Trainer */}
            <button
              type="button"
              onClick={() => navigate("/train/mentalMaths")}
              className="group relative flex flex-col items-center p-4 sm:p-6 md:p-8 bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center space-y-3 sm:space-y-5 md:space-y-6"
            >
              <div className="p-3 sm:p-4 rounded-full bg-violet-50 text-violet-600 group-hover:bg-violet-100 group-hover:scale-110 transition-transform duration-300">
                <Brain className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  Mental Maths Trainer
                </h2>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  Build speed and estimation without the calculator.
                </p>
              </div>
              <span className="text-xs sm:text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                Start Training &rarr;
              </span>
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-xl sm:rounded-2xl pointer-events-none transition-colors" />
            </button>
          </div>
        </div>
      </main>
      <TrainerFaqSection
        id="quant-faq"
        title="UCAT Quantitative Reasoning hub FAQs"
        intro="Guidance on using the Quantitative Reasoning hub, calculator trainer and mental maths practice to raise your UCAT QR score."
        faqs={trainerFaqs.quantHub}
      />
      <Footer />
    </div>
  );
}

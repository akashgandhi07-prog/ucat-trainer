import { useNavigate } from "react-router-dom";
import { Scale, Zap, LayoutList, ChevronRight } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function DecisionMakingPage() {
  const navigate = useNavigate();
  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/decision-making` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Decision Making", url: `${base}/decision-making` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <SEOHead
        title="UCAT Decision Making | TheUKCATPeople"
        description="Practice UCAT Decision Making with syllogism drills. Build pattern recognition with micro drills and full stimulus practice with macro drills."
        canonicalUrl={canonicalUrl}
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Scale className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Decision Making
              </h1>
              <p className="text-slate-600 mt-0.5">
                Train logical reasoning and syllogisms for the UCAT.
              </p>
            </div>
          </div>
          <div className="mb-8">
            <TutoringUpsell variant="hub" />
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Syllogisms Trainer
            </h2>
            <p className="text-slate-600 text-sm">
              Decide whether conclusions follow from given premises. Use micro
              drills for speed and pattern recognition, or macro drills for
              full UCAT-style stimulus with five conclusions.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate("/train/syllogism/micro")}
                className="group flex flex-col items-stretch p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <Zap className="w-5 h-5" />
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Micro Drill
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  One premise, one conclusion. Build instant pattern recognition
                  with keyboard shortcuts.
                </p>
              </button>
              <button
                type="button"
                onClick={() => navigate("/train/syllogism/macro")}
                className="group flex flex-col items-stretch p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <LayoutList className="w-5 h-5" />
                  </span>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Macro Drill
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Full stimulus with five conclusions. UCAT-style layout with
                  sticky passage and Yes/No for each.
                </p>
              </button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

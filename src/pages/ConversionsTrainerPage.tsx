import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ruler } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import ConversionTrainer from "../components/conversions/ConversionTrainer";
import SEOHead from "../components/seo/SEOHead";
import UcatGuidesPanel from "../components/layout/UcatGuidesPanel";
import { getSiteBaseUrl } from "../lib/siteUrl";
import { trackEvent, setActiveTrainer, clearActiveTrainer } from "../lib/analytics";

export default function ConversionsTrainerPage() {
  useEffect(() => {
    trackEvent("trainer_opened", {
      training_type: "unit_conversions",
      pathname: "/ucat-unit-conversions-trainer",
    });
    setActiveTrainer("unit_conversions", "conversion_drill");
    return () => clearActiveTrainer();
  }, []);

  const base = getSiteBaseUrl();
  const canonicalUrl = base ? `${base}/ucat-unit-conversions-trainer` : undefined;
  const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
  const breadcrumbs = base
    ? [
        { name: "Home", url: `${base}/` },
        { name: "Quantitative Reasoning", url: `${base}/ucat-quantitative-reasoning-practice` },
        { name: "Unit Conversions", url: `${base}/ucat-unit-conversions-trainer` },
      ]
    : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <SEOHead
        title="UCAT Unit Conversions Trainer (UK)"
        description="Practise UCAT Quantitative Reasoning unit conversions with worked explanations, calculator shortcuts, sense checks and common traps."
        canonicalUrl={canonicalUrl}
        imageUrl={ogImageUrl}
        imageAlt="UCAT unit conversions trainer with QR explanation sections"
        breadcrumbs={breadcrumbs}
      />
      <Header />
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/ucat-quantitative-reasoning-practice"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Quantitative Reasoning
          </Link>

          <div className="mb-6">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-4">
              <Ruler className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Unit Conversions Trainer</h1>
            <p className="mt-1 text-muted-foreground">
              Drill the QR unit traps: metric conversions, time conversions, rates per unit and per 100 g setups.
            </p>
          </div>

          <ConversionTrainer />
        </div>
      </main>
      <UcatGuidesPanel context="trainer" trainingType="unit_conversions" />
      <Footer />
    </div>
  );
}

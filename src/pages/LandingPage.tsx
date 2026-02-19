import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator, Scale } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function HomePage() {
    const navigate = useNavigate();
    const base = getSiteBaseUrl();
    const canonicalUrl = base ? `${base}/` : undefined;
    const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
    const breadcrumbs = base ? [{ name: "Home", url: `${base}/` }] : undefined;

    return (
        <div className="flex flex-col min-h-screen bg-background font-sans">
            <SEOHead
                title="Free UCAT Skills Trainer"
                description="Free UCAT practice tools for Verbal Reasoning, Decision Making, and Quantitative Reasoning. Master speed reading, syllogisms, mental math, and calculator usage."
                canonicalUrl={canonicalUrl}
                imageUrl={ogImageUrl}
                breadcrumbs={breadcrumbs}
            />
            <Header />
            <main className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
                    <div className="max-w-4xl w-full space-y-6 text-center sm:space-y-12">
                        <div className="space-y-2 sm:space-y-4">
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Free UCAT Skills Trainer
                            </p>
                            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                                Master the UCAT.
                            </h1>
                            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                                Select a section to begin your training.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 max-w-4xl mx-auto">
                            {/* Verbal Reasoning Card */}
                            <button
                                onClick={() => navigate("/verbal")}
                                className="group relative flex flex-col items-center p-4 sm:p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Verbal Reasoning – speed reading, rapid recall, keyword scanning"
                            >
                                <div className="p-3 sm:p-4 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <BookOpen className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-2 sm:mt-4 text-lg sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Verbal Reasoning
                                </h2>
                                <p className="mt-1 sm:mt-2 text-muted-foreground leading-snug text-sm sm:text-base">
                                    Speed reading, rapid recall and keyword scanning drills.
                                </p>
                                <span className="mt-2 sm:mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Decision Making Card */}
                            <button
                                onClick={() => navigate("/decision-making")}
                                className="group relative flex flex-col items-center p-4 sm:p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Decision Making – syllogism micro and macro drills"
                            >
                                <div className="p-3 sm:p-4 rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Scale className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-2 sm:mt-4 text-lg sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Decision Making
                                </h2>
                                <p className="mt-1 sm:mt-2 text-muted-foreground leading-snug text-sm sm:text-base">
                                    Syllogism micro and macro drills for full UCAT-style practice.
                                </p>
                                <span className="mt-2 sm:mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Quantitative Reasoning Card */}
                            <button
                                onClick={() => navigate("/quantitative")}
                                className="group relative flex flex-col items-center p-4 sm:p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Quantitative Reasoning – calculator and mental maths"
                            >
                                <div className="p-3 sm:p-4 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Calculator className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-2 sm:mt-4 text-lg sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Quantitative Reasoning
                                </h2>
                                <p className="mt-1 sm:mt-2 text-muted-foreground leading-snug text-sm sm:text-base">
                                    Calculator and mental maths: keypad speed and non-calculator fluency.
                                </p>
                                <span className="mt-2 sm:mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-2xl pointer-events-none transition-colors" />
                            </button>
                        </div>
                        <TutoringUpsell variant="inline" />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

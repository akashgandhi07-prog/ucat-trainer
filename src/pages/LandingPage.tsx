import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator, Scale } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import SEOHead from "../components/seo/SEOHead";
import TrainerFaqSection from "../components/seo/TrainerFaqSection";
import { trainerFaqs } from "../data/trainerFaqs";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function HomePage() {
    const navigate = useNavigate();
    const base = getSiteBaseUrl();
    const canonicalUrl = base ? `${base}/` : undefined;
    const ogImageUrl = base ? `${base}/og-trainer.png` : undefined;
    const breadcrumbs = base ? [{ name: "Home", url: `${base}/` }] : undefined;
    const ogImageAlt =
        "Free UCAT Skills Trainer interface for Verbal Reasoning, Decision Making, and Quantitative Reasoning practice";

    return (
        <div className="flex flex-col min-h-screen bg-background font-sans">
            <SEOHead
                title="Free UCAT Skills Trainer"
                description="Free UCAT practice tools for Verbal Reasoning, Decision Making, and Quantitative Reasoning. Master speed reading, syllogisms, mental math, and calculator usage."
                canonicalUrl={canonicalUrl}
                imageUrl={ogImageUrl}
                imageAlt={ogImageAlt}
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5 md:gap-8 max-w-4xl mx-auto">
                            {/* Verbal Reasoning Card */}
                            <button
                                onClick={() => navigate("/verbal")}
                                className="group relative flex flex-col items-center p-3 sm:p-5 md:p-8 bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Verbal Reasoning – speed reading, rapid recall, keyword scanning"
                            >
                                <div className="p-2.5 sm:p-3 md:p-4 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <BookOpen className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-1.5 sm:mt-3 md:mt-4 text-base sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Verbal Reasoning
                                </h2>
                                <p className="mt-0.5 sm:mt-1 md:mt-2 text-muted-foreground leading-snug text-xs sm:text-sm md:text-base">
                                    Speed reading, rapid recall and keyword scanning drills.
                                </p>
                                <span className="mt-1.5 sm:mt-2 md:mt-4 text-xs sm:text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-xl sm:rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Decision Making Card */}
                            <button
                                onClick={() => navigate("/decision-making")}
                                className="group relative flex flex-col items-center p-3 sm:p-5 md:p-8 bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Decision Making – syllogism micro and macro drills"
                            >
                                <div className="p-2.5 sm:p-3 md:p-4 rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Scale className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-1.5 sm:mt-3 md:mt-4 text-base sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Decision Making
                                </h2>
                                <p className="mt-0.5 sm:mt-1 md:mt-2 text-muted-foreground leading-snug text-xs sm:text-sm md:text-base">
                                    Syllogism micro and macro drills for full UCAT-style practice.
                                </p>
                                <span className="mt-1.5 sm:mt-2 md:mt-4 text-xs sm:text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-xl sm:rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Quantitative Reasoning Card */}
                            <button
                                onClick={() => navigate("/quantitative")}
                                className="group relative flex flex-col items-center p-3 sm:p-5 md:p-8 bg-card border border-border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center"
                                aria-label="Quantitative Reasoning – calculator and mental maths"
                            >
                                <div className="p-2.5 sm:p-3 md:p-4 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                                    <Calculator className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10" aria-hidden />
                                </div>
                                <h2 className="mt-1.5 sm:mt-3 md:mt-4 text-base sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                    Quantitative Reasoning
                                </h2>
                                <p className="mt-0.5 sm:mt-1 md:mt-2 text-muted-foreground leading-snug text-xs sm:text-sm md:text-base">
                                    Calculator and mental maths: keypad speed and non-calculator fluency.
                                </p>
                                <span className="mt-1.5 sm:mt-2 md:mt-4 text-xs sm:text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-xl sm:rounded-2xl pointer-events-none transition-colors" />
                            </button>
                        </div>
                        <TutoringUpsell variant="inline" />
                    </div>
                </div>
                <TrainerFaqSection
                    id="home-faq"
                    title="Common questions about this UCAT trainer"
                    intro="Answers to common questions about how to use this free UCAT practice platform alongside your main question bank and the official resources."
                    faqs={trainerFaqs.home}
                />
            </main>
            <Footer />
        </div>
    );
}

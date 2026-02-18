import { useNavigate } from "react-router-dom";
import { BookOpen, Calculator, Scale } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import TutoringUpsell from "../components/layout/TutoringUpsell";
import SEOHead from "../components/seo/SEOHead";
import { getSiteBaseUrl } from "../lib/siteUrl";

export default function HomePage() {
    const navigate = useNavigate();
    const canonicalUrl = getSiteBaseUrl() ? `${getSiteBaseUrl()}/` : undefined;
    // TODO: Add proper OG image for landing page
    const ogImageUrl = getSiteBaseUrl() ? `${getSiteBaseUrl()}/og-trainer.png` : undefined;

    return (
        <div className="flex flex-col min-h-screen bg-background font-sans">
            <SEOHead
                title="UCAT Trainer | TheUKCATPeople"
                description="Free UCAT practice tools for Verbal Reasoning, Decision Making, and Quantitative Reasoning. Master speed reading, syllogisms, mental math, and calculator usage."
                canonicalUrl={canonicalUrl}
                imageUrl={ogImageUrl}
            />
            <Header />
            <main className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl w-full space-y-12 text-center">
                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
                                Master the UCAT.
                            </h1>
                            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                                Select a section to begin your training.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
                            {/* Verbal Reasoning Card */}
                            <button
                                onClick={() => navigate("/verbal")}
                                className="group relative flex flex-col items-center p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center space-y-6"
                            >
                                <div className="p-4 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                        Verbal Reasoning
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Improve reading speed and comprehension with speed reading, rapid recall, and keyword scanning drills.
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Decision Making Card */}
                            <button
                                onClick={() => navigate("/decision-making")}
                                className="group relative flex flex-col items-center p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center space-y-6"
                            >
                                <div className="p-4 rounded-full bg-amber-50 text-amber-600 group-hover:bg-amber-100 group-hover:scale-110 transition-transform duration-300">
                                    <Scale className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                        Decision Making
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Syllogisms trainer: micro drills for speed and macro drills for full UCAT-style practice.
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                    Start Training &rarr;
                                </span>
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/10 rounded-2xl pointer-events-none transition-colors" />
                            </button>

                            {/* Quantitative Reasoning Card */}
                            <button
                                onClick={() => navigate("/quantitative")}
                                className="group relative flex flex-col items-center p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300 text-center space-y-6"
                            >
                                <div className="p-4 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-transform duration-300">
                                    <Calculator className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                        Quantitative Reasoning
                                    </h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        Calculator trainer and mental maths: master the keypad and build speed without it.
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
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

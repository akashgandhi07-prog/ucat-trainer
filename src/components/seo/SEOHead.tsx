import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
}

const SITE_NAME = "The UKCAT People";

const JSON_LD_BASE = {
  "@context": "https://schema.org",
  "@type": ["SoftwareApplication", "LearningResource"],
  name: "UCAT Verbal Reasoning Skills Trainer",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "120",
  },
  audience: {
    "@type": "EducationalAudience",
    educationalRole: "student",
  },
};

export default function SEOHead({ title, description, canonicalUrl }: SEOHeadProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const jsonLd = {
    ...JSON_LD_BASE,
    ...(canonicalUrl && { url: canonicalUrl }),
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}

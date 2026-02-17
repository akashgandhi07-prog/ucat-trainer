import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  /** Absolute URL for og:image and twitter:image (e.g. https://ucat.theukcatpeople.co.uk/og-trainer.png) */
  imageUrl?: string;
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

const OG_IMAGE_DEFAULT_WIDTH = 1200;
const OG_IMAGE_DEFAULT_HEIGHT = 630;

export default function SEOHead({ title, description, canonicalUrl, imageUrl }: SEOHeadProps) {
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
      {imageUrl && (
        <>
          <meta property="og:image" content={imageUrl} />
          <meta property="og:image:width" content={String(OG_IMAGE_DEFAULT_WIDTH)} />
          <meta property="og:image:height" content={String(OG_IMAGE_DEFAULT_HEIGHT)} />
        </>
      )}
      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}

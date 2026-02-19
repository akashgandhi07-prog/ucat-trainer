import { Helmet } from "react-helmet-async";

/** Single breadcrumb: name and absolute URL */
export type BreadcrumbItem = { name: string; url: string };

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  /** Absolute URL for og:image and twitter:image (e.g. https://ucat.theukcatpeople.co.uk/og-trainer.png) */
  imageUrl?: string;
  /** Optional alt text describing the social/OG image content. */
  imageAlt?: string;
  /** Breadcrumbs for BreadcrumbList JSON-LD (improves snippet display). Use absolute URLs. */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional: real aggregate rating data. Omit or pass real values only (Google policy). */
  aggregateRating?: { ratingValue: string; reviewCount: string };
  /** Optional: social profile URLs for the Organization schema. */
  organizationSameAs?: string[];
  /** Optional: Twitter/X handle for the site account (e.g. @TheUKCATPeople). */
  twitterSite?: string;
  /** Optional: Twitter/X handle for the content creator. */
  twitterCreator?: string;
  /** When true, ask search engines not to index this page (e.g. reset password, account pages). */
  noindex?: boolean;
}

const SITE_NAME = "TheUKCATPeople";

/** Organization schema – referenced by WebSite and SoftwareApplication */
function buildOrganizationSchema(siteBaseUrl: string, sameAs?: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteBaseUrl}/#organization`,
    name: SITE_NAME,
    url: "https://www.theukcatpeople.co.uk",
    ...(sameAs && sameAs.length > 0 ? { sameAs } : null),
  };
}

/** WebSite schema – helps search engines understand site identity and scope */
function buildWebSiteSchema(siteBaseUrl: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteBaseUrl}/#website`,
    name: "Free UCAT Skills Trainer",
    url: siteBaseUrl,
    description,
    publisher: { "@id": `${siteBaseUrl}/#organization` },
    inLanguage: "en-GB",
  };
}

/** SoftwareApplication + LearningResource – main product schema for each page */
function buildApplicationSchema(
  options: {
    title: string;
    description: string;
    canonicalUrl?: string;
    imageUrl?: string;
    siteBaseUrl?: string;
    aggregateRating?: { ratingValue: string; reviewCount: string };
  }
) {
  const {
    title,
    description,
    canonicalUrl,
    imageUrl,
    siteBaseUrl,
    aggregateRating,
  } = options;

  const app: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "LearningResource"],
    name: title,
    description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    inLanguage: "en-GB",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
    },
  };

  if (canonicalUrl) app.url = canonicalUrl;
  if (imageUrl) app.image = imageUrl;
  if (siteBaseUrl)
    app.publisher = { "@id": `${siteBaseUrl}/#organization` };
  if (aggregateRating)
    app.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
    };

  return app;
}

/** BreadcrumbList schema – can enable breadcrumb display in SERPs */
function buildBreadcrumbSchema(breadcrumbs: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const OG_IMAGE_DEFAULT_WIDTH = 1200;
const OG_IMAGE_DEFAULT_HEIGHT = 630;

export default function SEOHead({
  title,
  description,
  canonicalUrl,
  imageUrl,
  imageAlt,
  breadcrumbs,
  aggregateRating,
  organizationSameAs,
  twitterSite,
  twitterCreator,
  noindex,
}: SEOHeadProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const siteBaseUrl = canonicalUrl
    ? new URL(canonicalUrl).origin
    : undefined;

  const scripts: object[] = [];

  if (siteBaseUrl && !noindex) {
    scripts.push(buildOrganizationSchema(siteBaseUrl, organizationSameAs));
    scripts.push(buildWebSiteSchema(siteBaseUrl, description));
  }

  if (!noindex) {
    scripts.push(
      buildApplicationSchema({
        title: fullTitle,
        description,
        canonicalUrl,
        imageUrl,
        siteBaseUrl,
        aggregateRating,
      })
    );
    if (breadcrumbs && breadcrumbs.length > 0) {
      scripts.push(buildBreadcrumbSchema(breadcrumbs));
    }
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:site_name" content="Free UCAT Skills Trainer" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {imageUrl && (
        <>
          <meta property="og:image" content={imageUrl} />
          <meta property="og:image:width" content={String(OG_IMAGE_DEFAULT_WIDTH)} />
          <meta property="og:image:height" content={String(OG_IMAGE_DEFAULT_HEIGHT)} />
          {imageAlt && <meta property="og:image:alt" content={imageAlt} />}
        </>
      )}
      <meta name="twitter:card" content={imageUrl ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && <meta name="twitter:creator" content={twitterCreator} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {imageUrl && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
      {scripts.map((jsonLd, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      ))}
    </Helmet>
  );
}

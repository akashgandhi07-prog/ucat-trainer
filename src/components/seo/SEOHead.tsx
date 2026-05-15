import { Helmet } from "react-helmet-async";
import {
  SEO_CREATOR_PERSON_ID_FRAGMENT,
  SEO_CREATOR_SCHEMA,
  SEO_DEFAULT_ORGANIZATION_SAME_AS,
  SEO_DEFAULT_TWITTER_SITE,
  SEO_EDUCATIONAL_USE,
  SEO_LEARNING_RESOURCE_TYPE,
} from "../../lib/seoDefaults";

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

function creatorPersonId(siteBaseUrl: string) {
  return `${siteBaseUrl}/#${SEO_CREATOR_PERSON_ID_FRAGMENT}`;
}

/** Person schema: trainer content author (schema-only; not rendered in UI) */
function buildPersonSchema(siteBaseUrl: string) {
  const id = creatorPersonId(siteBaseUrl);
  const orgId = `${siteBaseUrl}/#organization`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": id,
    name: SEO_CREATOR_SCHEMA.name,
    honorificPrefix: SEO_CREATOR_SCHEMA.honorificPrefix,
    givenName: SEO_CREATOR_SCHEMA.givenName,
    familyName: SEO_CREATOR_SCHEMA.familyName,
    jobTitle: SEO_CREATOR_SCHEMA.jobTitle,
    description: SEO_CREATOR_SCHEMA.description,
    knowsAbout: [...SEO_CREATOR_SCHEMA.knowsAbout],
    worksFor: { "@id": orgId },
  };
}

/** Organization schema - referenced by WebSite and SoftwareApplication */
function buildOrganizationSchema(siteBaseUrl: string, sameAs: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteBaseUrl}/#organization`,
    name: SITE_NAME,
    url: "https://www.theukcatpeople.co.uk",
    sameAs,
    founder: { "@id": creatorPersonId(siteBaseUrl) },
    address: {
      "@type": "PostalAddress",
      addressCountry: "GB",
    },
    areaServed: {
      "@type": "Country",
      name: "United Kingdom",
    },
    logo: {
      "@type": "ImageObject",
      url: `${siteBaseUrl}/favicon.svg`,
    },
  };
}

/** WebSite schema - helps search engines understand site identity and scope */
function buildWebSiteSchema(siteBaseUrl: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteBaseUrl}/#website`,
    name: "Free UCAT Skills Trainer",
    url: siteBaseUrl,
    description,
    publisher: { "@id": `${siteBaseUrl}/#organization` },
    copyrightHolder: { "@id": `${siteBaseUrl}/#organization` },
    inLanguage: "en-GB",
    about: {
      "@type": "Thing",
      name: "UCAT (University Clinical Aptitude Test)",
      description:
        "UK university admissions test for medicine, dentistry and related courses",
    },
  };
}

/** SoftwareApplication + LearningResource - main product schema for each page */
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

  const creatorId =
    siteBaseUrl != null && siteBaseUrl.length > 0
      ? creatorPersonId(siteBaseUrl)
      : undefined;

  const app: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "LearningResource"],
    name: title,
    description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    inLanguage: "en-GB",
    availableLanguage: "en-GB",
    areaServed: {
      "@type": "Country",
      name: "United Kingdom",
    },
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
    isAccessibleForFree: true,
    learningResourceType: SEO_LEARNING_RESOURCE_TYPE,
    educationalUse: SEO_EDUCATIONAL_USE,
  };

  if (creatorId) {
    app.author = { "@id": creatorId };
    app.creator = { "@id": creatorId };
  }

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

/** BreadcrumbList schema - can enable breadcrumb display in SERPs */
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

  const mergedSameAs = Array.from(
    new Set([...SEO_DEFAULT_ORGANIZATION_SAME_AS, ...(organizationSameAs ?? [])]),
  );
  const effectiveTwitterSite = twitterSite ?? SEO_DEFAULT_TWITTER_SITE;

  const scripts: object[] = [];

  if (siteBaseUrl && !noindex) {
    scripts.push(buildPersonSchema(siteBaseUrl));
    scripts.push(buildOrganizationSchema(siteBaseUrl, mergedSameAs));
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
    <Helmet htmlAttributes={{ lang: "en-GB" }}>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta httpEquiv="content-language" content="en-GB" />
      {!noindex && (
        <>
          <meta name="geo.region" content="GB" />
          <meta name="geo.placename" content="United Kingdom" />
        </>
      )}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {canonicalUrl && !noindex && (
        <>
          <link rel="alternate" hrefLang="en-gb" href={canonicalUrl} />
          <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
        </>
      )}
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
      {!noindex && (
        <meta name="twitter:site" content={effectiveTwitterSite} />
      )}
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

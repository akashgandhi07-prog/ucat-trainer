import { useEffect } from "react";
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

/*
 * Head management is done imperatively rather than via react-helmet-async:
 * that library silently stops applying tags under React 19, which left every
 * page serving the static index.html title/description. The effect below owns
 * the managed tags directly, so behaviour is deterministic across SPA
 * navigations, and pages without SEOHead fall back to the index.html defaults.
 */
const MANAGED_ATTR = "data-seo-managed";

type MetaSpec = { attr: "name" | "property" | "http-equiv"; key: string; content: string };
type LinkSpec = { rel: string; href: string; hreflang?: string };

/** index.html defaults, captured once so unmount can restore them. */
let defaultTitle: string | null = null;
let defaultDescription: string | null = null;
let defaultLang: string | null = null;

function captureDefaults() {
  if (defaultTitle === null) defaultTitle = document.title;
  if (defaultDescription === null) {
    defaultDescription =
      document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "";
  }
  if (defaultLang === null) defaultLang = document.documentElement.lang || "en";
}

function removeManagedTags() {
  document.head
    .querySelectorAll(`[${MANAGED_ATTR}]`)
    .forEach((el) => el.remove());
}

function applyHead(
  fullTitle: string,
  description: string,
  metas: MetaSpec[],
  links: LinkSpec[],
  jsonLdScripts: object[],
) {
  captureDefaults();
  document.title = fullTitle;
  document.documentElement.lang = "en-GB";

  // The description meta exists statically in index.html: update it in place.
  const descTag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descTag) descTag.content = description;

  // Everything else is fully owned by SEOHead: rebuild from scratch each time.
  removeManagedTags();
  for (const spec of metas) {
    const el = document.createElement("meta");
    el.setAttribute(spec.attr, spec.key);
    el.setAttribute("content", spec.content);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  for (const spec of links) {
    const el = document.createElement("link");
    el.setAttribute("rel", spec.rel);
    el.setAttribute("href", spec.href);
    if (spec.hreflang) el.setAttribute("hreflang", spec.hreflang);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  for (const jsonLd of jsonLdScripts) {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify(jsonLd);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
}

function restoreDefaultHead() {
  removeManagedTags();
  if (defaultTitle !== null) document.title = defaultTitle;
  if (defaultLang !== null) document.documentElement.lang = defaultLang;
  const descTag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (descTag && defaultDescription !== null) descTag.content = defaultDescription;
}

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

  const metas: MetaSpec[] = [
    { attr: "http-equiv", key: "content-language", content: "en-GB" },
  ];
  if (!noindex) {
    metas.push(
      { attr: "name", key: "geo.region", content: "GB" },
      { attr: "name", key: "geo.placename", content: "United Kingdom" },
      {
        attr: "name",
        key: "robots",
        content: "index, follow, max-image-preview:large, max-snippet:-1",
      },
    );
  } else {
    metas.push({ attr: "name", key: "robots", content: "noindex, nofollow" });
  }
  metas.push(
    { attr: "property", key: "og:title", content: fullTitle },
    { attr: "property", key: "og:description", content: description },
    { attr: "property", key: "og:type", content: "website" },
    { attr: "property", key: "og:locale", content: "en_GB" },
    { attr: "property", key: "og:site_name", content: "Free UCAT Skills Trainer" },
  );
  if (canonicalUrl) metas.push({ attr: "property", key: "og:url", content: canonicalUrl });
  if (imageUrl) {
    metas.push(
      { attr: "property", key: "og:image", content: imageUrl },
      { attr: "property", key: "og:image:width", content: String(OG_IMAGE_DEFAULT_WIDTH) },
      { attr: "property", key: "og:image:height", content: String(OG_IMAGE_DEFAULT_HEIGHT) },
    );
    if (imageAlt) metas.push({ attr: "property", key: "og:image:alt", content: imageAlt });
  }
  metas.push(
    { attr: "name", key: "twitter:card", content: imageUrl ? "summary_large_image" : "summary" },
    { attr: "name", key: "twitter:title", content: fullTitle },
    { attr: "name", key: "twitter:description", content: description },
  );
  if (!noindex) metas.push({ attr: "name", key: "twitter:site", content: effectiveTwitterSite });
  if (twitterCreator) metas.push({ attr: "name", key: "twitter:creator", content: twitterCreator });
  if (imageUrl) {
    metas.push({ attr: "name", key: "twitter:image", content: imageUrl });
    if (imageAlt) metas.push({ attr: "name", key: "twitter:image:alt", content: imageAlt });
  }

  const links: LinkSpec[] = [];
  if (canonicalUrl) {
    links.push({ rel: "canonical", href: canonicalUrl });
    if (!noindex) {
      links.push(
        { rel: "alternate", hreflang: "en-gb", href: canonicalUrl },
        { rel: "alternate", hreflang: "x-default", href: canonicalUrl },
      );
    }
  }

  // Serialize so the effect re-runs exactly when any rendered tag changes.
  const headSignature = JSON.stringify({ fullTitle, description, metas, links, scripts });

  useEffect(() => {
    applyHead(fullTitle, description, metas, links, scripts);
    return restoreDefaultHead;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- headSignature covers every input above
  }, [headSignature]);

  return null;
}

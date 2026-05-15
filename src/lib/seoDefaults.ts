/**
 * Default brand and trust URLs for Organization JSON-LD (sameAs).
 * Pages can pass additional URLs via SEOHead `organizationSameAs`.
 */
export const SEO_DEFAULT_ORGANIZATION_SAME_AS: readonly string[] = [
  "https://www.theukcatpeople.co.uk",
  "https://www.trustpilot.com/review/www.theukcatpeople.co.uk",
] as const;

/** Site account for twitter:site when a page does not override it */
export const SEO_DEFAULT_TWITTER_SITE = "@TheUKCATPeople";

/** Fragment for JSON-LD @id: `${origin}/#${SEO_CREATOR_PERSON_ID_FRAGMENT}` */
export const SEO_CREATOR_PERSON_ID_FRAGMENT = "person-dr-akash-gandhi" as const;

/**
 * Creator credit for schema.org only (not shown in the UI).
 * Used by Person, Organization (founder), and LearningResource (author / creator).
 */
export const SEO_CREATOR_SCHEMA = {
  givenName: "Akash",
  familyName: "Gandhi",
  honorificPrefix: "Dr",
  /** Shown in name; formal display name */
  name: "Dr Akash Gandhi",
  jobTitle:
    "NHS General Practitioner; UCAT specialist; medical school admissions expert",
  description:
    "Educational content and skills design for this trainer are by Dr Akash Gandhi: NHS GP, UCAT expert and medical admissions educator with clinical expertise.",
  knowsAbout: [
    "UCAT",
    "University Clinical Aptitude Test preparation",
    "Medical school admissions (UK)",
    "NHS general practice",
    "Clinical medicine",
  ],
} as const;

/** LearningResource.learningResourceType (plain language, UK). */
export const SEO_LEARNING_RESOURCE_TYPE =
  "Interactive UCAT skills practice · timed drills and study tools";

/** LearningResource.educationalUse */
export const SEO_EDUCATIONAL_USE =
  "Preparation for the UCAT for UK medicine, dentistry and related courses";

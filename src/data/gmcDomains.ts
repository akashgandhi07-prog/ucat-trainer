import type { GMCDomainId } from "../types/sjt";

export type GMCDomain = {
  id: GMCDomainId;
  name: string;
  shortName: string;
  description: string;
  keyPrinciples: string[];
  url: string;
  color: string;
};

export const GMC_DOMAINS: Record<GMCDomainId, GMCDomain> = {
  knowledge_skills_development: {
    id: "knowledge_skills_development",
    name: "Knowledge, skills and development",
    shortName: "Knowledge & Skills",
    description:
      "Maintaining and developing your knowledge and skills, recognising the limits of your competence, and keeping up to date with developments in your field.",
    keyPrinciples: [
      "Recognise and work within your limits of competence",
      "Keep your knowledge and skills up to date",
      "Seek help when you are not sure how to proceed",
      "Contribute to the education and training of colleagues",
      "Reflect on your practice and seek feedback",
    ],
    url: "https://www.gmc-uk.org/professional-standards/professional-standards-for-doctors/good-medical-practice/knowledge-skills-and-development",
    color: "blue",
  },
  patients_partnership_communication: {
    id: "patients_partnership_communication",
    name: "Patients, partnership and communication",
    shortName: "Patients & Communication",
    description:
      "Treating patients with dignity and respect, listening to them, sharing information honestly, obtaining informed consent, and maintaining confidentiality.",
    keyPrinciples: [
      "Prioritise patient safety and wellbeing",
      "Treat patients with dignity, respect and compassion",
      "Listen to patients and respond to their concerns",
      "Maintain patient confidentiality",
      "Ensure patients can make informed decisions about their care",
      "Patients with mental capacity must be involved in decisions about their treatment",
    ],
    url: "https://www.gmc-uk.org/professional-standards/professional-standards-for-doctors/good-medical-practice/patients-partnership-and-communication",
    color: "emerald",
  },
  colleagues_culture_safety: {
    id: "colleagues_culture_safety",
    name: "Colleagues, culture and safety",
    shortName: "Colleagues & Safety",
    description:
      "Working collaboratively with colleagues, maintaining a safe environment, raising concerns about patient safety or conduct, and supporting others in the team.",
    keyPrinciples: [
      "Raise concerns promptly when patient safety is at risk",
      "Work collaboratively and with respect for colleagues",
      "Never bully, harass or discriminate against colleagues",
      "Support colleagues who are struggling",
      "Contribute to a culture of openness and honesty",
      "Take steps to protect patients from a colleague whose practice may be unsafe",
    ],
    url: "https://www.gmc-uk.org/professional-standards/professional-standards-for-doctors/good-medical-practice/colleagues-culture-and-safety",
    color: "amber",
  },
  trust_professionalism: {
    id: "trust_professionalism",
    name: "Trust and professionalism",
    shortName: "Trust & Professionalism",
    description:
      "Acting with honesty and integrity, managing conflicts of interest, maintaining appropriate professional boundaries, and upholding the reputation of the profession.",
    keyPrinciples: [
      "Be honest and act with integrity at all times",
      "Never mislead patients, colleagues or employers",
      "Declare and manage conflicts of interest",
      "Maintain appropriate professional boundaries",
      "Do not accept gifts that could influence your professional judgement",
      "Never discriminate unfairly against patients or colleagues",
    ],
    url: "https://www.gmc-uk.org/professional-standards/professional-standards-for-doctors/good-medical-practice/trust-and-professionalism",
    color: "purple",
  },
};

export const GMC_DOMAINS_LIST: GMCDomain[] = Object.values(GMC_DOMAINS);

export const GMP_MAIN_URL =
  "https://www.gmc-uk.org/professional-standards/professional-standards-for-doctors/good-medical-practice";

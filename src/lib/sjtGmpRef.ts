import { GMC_DOMAINS } from "../data/gmcDomains";
import type { GmpReference, GMCDomainId } from "../types/sjt";

/** Item-level ref, then scenario-level ref, then domain default from GMC domains. */
export function resolveSjtGmpRef(
  domain: GMCDomainId,
  itemRef?: GmpReference,
  questionRef?: GmpReference,
): GmpReference {
  if (itemRef) return itemRef;
  if (questionRef) return questionRef;
  const d = GMC_DOMAINS[domain];
  return {
    label: `GMP · ${d.name}`,
    url: d.url,
  };
}

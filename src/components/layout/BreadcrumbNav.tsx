import { Link } from "react-router-dom";
import type { BreadcrumbItem } from "../seo/SEOHead";

type BreadcrumbNavProps = {
  items?: BreadcrumbItem[];
};

function toPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

export default function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 sm:mb-4 text-xs sm:text-sm text-slate-500"
    >
      <ol className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const path = toPath(item.url);

          return (
            <li key={item.url} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
              )}
              {isLast ? (
                <span className="font-medium text-slate-700">{item.name}</span>
              ) : (
                <Link
                  to={path}
                  className="hover:text-blue-600 transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


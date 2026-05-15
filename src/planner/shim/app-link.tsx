import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { mapPlannerPath } from './app-navigation'

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  children: ReactNode
}

export default function AppLink({ href, children, target, rel, className, ...rest }: AppLinkProps) {
  if (
    href.startsWith('http') ||
    href.startsWith('mailto:') ||
    target === '_blank' ||
    href.startsWith('/auth') ||
    href.startsWith('/plan/')
  ) {
    return (
      <a href={href} target={target} rel={rel} className={className} {...rest}>
        {children}
      </a>
    )
  }

  const to = mapPlannerPath(href)
  return (
    <RouterLink to={to} className={className} {...rest}>
      {children}
    </RouterLink>
  )
}

export { AppLink as Link }

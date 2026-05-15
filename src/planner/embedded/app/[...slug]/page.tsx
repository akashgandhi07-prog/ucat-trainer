import { notFound } from 'next/navigation'
import { TrainerShell } from '@/components/trainer/trainer-shell'

interface PageProps {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function isTrainerPublicBrowserPath(path: string) {
  return path.startsWith('/ucat')
}

function buildPathWithQuery(pathname: string, sp: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue
    if (Array.isArray(val)) val.forEach(v => qs.append(key, v))
    else qs.append(key, val)
  }
  const q = qs.toString()
  return q ? `${pathname}?${q}` : pathname
}

export default async function TrainerPublicCatchAll({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const pathname = `/${slug.join('/')}`
  if (!isTrainerPublicBrowserPath(pathname)) notFound()
  const pathWithQuery = buildPathWithQuery(pathname, sp)
  return <TrainerShell pathWithQuery={pathWithQuery} />
}

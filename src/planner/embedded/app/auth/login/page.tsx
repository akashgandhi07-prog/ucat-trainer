import LoginClient from './login-client'

type PageProps = { searchParams: Promise<{ invite?: string }> }

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <LoginClient invite={params.invite} />
}

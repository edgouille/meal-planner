import { useEffect } from 'react'
import { clearSession, LoginPage, RegisterPage, useSession } from '../features/auth/index.ts'
import { HomePage } from '../features/home/index.ts'
import { navigate, useInternalLinks, usePathname } from '../shared/lib/navigation.ts'

const authPaths = ['/connexion', '/inscription']

function App() {
  useInternalLinks()
  const pathname = usePathname()
  const session = useSession()
  const redirectHome = (session && authPaths.includes(pathname)) || !['/', ...authPaths].includes(pathname)

  useEffect(() => {
    if (redirectHome) navigate('/', { replace: true })
    else window.scrollTo(0, 0)
  }, [pathname, redirectHome])

  if (redirectHome) return null
  if (pathname === '/connexion') return <LoginPage />
  if (pathname === '/inscription') return <RegisterPage />
  return <HomePage userName={session?.user.displayName} onSignOut={clearSession} />
}

export default App

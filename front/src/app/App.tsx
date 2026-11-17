import { useEffect } from 'react'
import { clearSession, getSession, LoginPage, RegisterPage, updateSessionUser, useSession } from '../features/auth/index.ts'
import { HomePage } from '../features/home/index.ts'
import { SettingsPage } from '../features/users/index.ts'
import { configureAuthentication } from '../shared/api/client.ts'
import { navigate, useInternalLinks, usePathname } from '../shared/lib/navigation.ts'

// Protected API requests carry the session token; a rejected token ends the session, which sends
// the user back to the sign-in page below.
configureAuthentication({
  getAccessToken: () => {
    const session = getSession()
    return session && session.expiresAt > Date.now() ? session.accessToken : undefined
  },
  onUnauthorized: clearSession,
})

const authPaths = ['/connexion', '/inscription']
const protectedPaths = ['/parametres']
const knownPaths = ['/', ...authPaths, ...protectedPaths]

function redirectFor(pathname: string, signedIn: boolean) {
  if (signedIn && authPaths.includes(pathname)) return '/'
  if (!signedIn && protectedPaths.includes(pathname)) return '/connexion'
  if (!knownPaths.includes(pathname)) return '/'
}

function App() {
  useInternalLinks()
  const pathname = usePathname()
  const session = useSession()
  const redirect = redirectFor(pathname, Boolean(session))

  useEffect(() => {
    if (redirect) navigate(redirect, { replace: true })
    else window.scrollTo(0, 0)
  }, [pathname, redirect])

  if (redirect) return null
  if (pathname === '/connexion') return <LoginPage />
  if (pathname === '/inscription') return <RegisterPage />
  if (pathname === '/parametres') {
    return <SettingsPage onProfileSaved={({ displayName }) => updateSessionUser({ displayName })} onSignOut={clearSession} />
  }
  return <HomePage userName={session?.user.displayName} onSignOut={clearSession} />
}

export default App

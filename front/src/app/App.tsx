import { MealPlansPage } from '../features/meal-plans/index.ts'
import { useEffect } from 'react'
import { clearSession, getSession, LoginPage, RegisterPage, updateSessionUser, useSession } from '../features/auth/index.ts'
import { HomePage } from '../features/home/index.ts'
import { SettingsPage } from '../features/users/index.ts'
import { RecipesPage, listRecipes } from '../features/recipes/index.ts'
import { configureAuthentication } from '../shared/api/client.ts'
import { navigate, useInternalLinks, usePathname } from '../shared/lib/navigation.ts'
import { SiteHeader } from '../shared/ui/SiteHeader.tsx'

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
const protectedPaths = ['/parametres', '/recettes', '/planning']
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
  let page = <HomePage signedIn={Boolean(session)} />
  if (pathname === '/planning') page = <MealPlansPage searchRecipes={listRecipes} />
  if (pathname === '/recettes') page = <RecipesPage />
  if (pathname === '/parametres') {
    page = <SettingsPage onProfileSaved={({ displayName }) => updateSessionUser({ displayName })} />
  }
  return (
    <>
      <SiteHeader userName={session?.user.displayName} currentPath={pathname} onSignOut={clearSession} />
      {page}
    </>
  )
}

export default App

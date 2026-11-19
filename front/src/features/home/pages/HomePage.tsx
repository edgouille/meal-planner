import { useEffect } from 'react'
import { CallToAction } from '../components/CallToAction.tsx'
import { FeatureList } from '../components/FeatureList.tsx'
import { Hero } from '../components/Hero.tsx'
import { HowItWorks } from '../components/HowItWorks.tsx'
import { NutritionHighlight } from '../components/NutritionHighlight.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'

export function HomePage({ signedIn = false }: { signedIn?: boolean }) {
  useEffect(() => {
    document.title = 'MealPlanner — La semaine à croquer'
  }, [])

  return (
    <>
      <main>
        <Hero signedIn={signedIn} />
        <FeatureList />
        <HowItWorks />
        <NutritionHighlight />
        {!signedIn && <CallToAction />}
      </main>
      <SiteFooter />
    </>
  )
}

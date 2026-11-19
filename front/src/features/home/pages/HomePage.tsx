import { useEffect } from 'react'
import { CallToAction } from '../components/CallToAction.tsx'
import { FeatureList } from '../components/FeatureList.tsx'
import { Hero } from '../components/Hero.tsx'
import { HowItWorks } from '../components/HowItWorks.tsx'
import { NutritionHighlight } from '../components/NutritionHighlight.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { SiteHeader, type SiteHeaderProps } from '../components/SiteHeader.tsx'

export function HomePage(props: SiteHeaderProps) {
  useEffect(() => {
    document.title = 'MealPlanner — La semaine à croquer'
  }, [])

  return (
    <>
      <SiteHeader {...props} />
      <main>
        <Hero signedIn={Boolean(props.userName)} />
        <FeatureList />
        <HowItWorks />
        <NutritionHighlight />
        {!props.userName && <CallToAction />}
      </main>
      <SiteFooter />
    </>
  )
}

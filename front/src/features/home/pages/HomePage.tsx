import { CallToAction } from '../components/CallToAction.tsx'
import { FeatureList } from '../components/FeatureList.tsx'
import { Hero } from '../components/Hero.tsx'
import { HowItWorks } from '../components/HowItWorks.tsx'
import { NutritionHighlight } from '../components/NutritionHighlight.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <FeatureList />
        <HowItWorks />
        <NutritionHighlight />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  )
}

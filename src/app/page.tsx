import { Navbar } from "@/src/components/landing/Navbar"
import { HeroSection } from "@/src/components/landing/HeroSection"
import { ProblemOpportunitySection } from "@/src/components/landing/ProblemOpportunitySection"
import { FeaturesSection } from "@/src/components/landing/FeaturesSection"
import { HowItWorksSection } from "@/src/components/landing/HowItWorksSection"
import { ProductShowcaseSection } from "@/src/components/landing/ProductShowcaseSection"
import { WhyAnzaSection } from "@/src/components/landing/WhyAnzaSection"
import { AudienceSection } from "@/src/components/landing/AudienceSection"
import { PricingSection } from "@/src/components/landing/PricingSection"
import { FaqSection } from "@/src/components/landing/FaqSection"
import { CtaSection } from "@/src/components/landing/CtaSection"
import { Footer } from "@/src/components/landing/Footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:bg-emerald-500/30 dark:selection:text-emerald-200">
      {/* SECTION 1: Sticky Navigation Bar */}
      <Navbar />

      <main className="flex-1">
        {/* SECTION 2: Hero Section */}
        <HeroSection />

        {/* SECTION 3: Problem and Opportunity */}
        <ProblemOpportunitySection />

        {/* SECTION 4: Product Features */}
        <FeaturesSection />

        {/* SECTION 5: How Anza Works */}
        <HowItWorksSection />

        {/* SECTION 6: Dedicated Product Showcase */}
        <ProductShowcaseSection />

        {/* SECTION 7: Why Anza Is Different */}
        <WhyAnzaSection />

        {/* SECTION 8: Who Is Anza For? */}
        <AudienceSection />

        {/* SECTION 9: Pricing Preview */}
        <PricingSection />

        {/* SECTION 10: Frequently Asked Questions */}
        <FaqSection />

        {/* SECTION 11: Final Closing CTA */}
        <CtaSection />
      </main>

      {/* SECTION 12: Comprehensive Footer */}
      <Footer />
    </div>
  )
}

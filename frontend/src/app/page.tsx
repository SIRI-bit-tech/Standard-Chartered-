import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Services } from '@/components/landing/services'
import { CTA } from '@/components/landing/cta'
import { LeadershipSection } from '@/components/landing/LeadershipSection'
import { Footer } from '@/components/landing/footer'
import { ChatLoader } from '@/components/support/ChatLoader'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Services />
      <CTA />
      <LeadershipSection />
      <ChatLoader />
      <Footer />
    </div>
  )
}

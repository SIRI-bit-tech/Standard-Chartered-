import { Header } from '@/components/landing/header'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { Services } from '@/components/landing/services'
import { CTA } from '@/components/landing/cta'
import { Leadership } from '@/components/landing/leadership'
import { Footer } from '@/components/landing/footer'
import { ChatWidget } from '@/components/support/ChatWidget'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Services />
      <CTA />
      <Leadership />
      <ChatWidget />
      <Footer />
    </div>
  )
}

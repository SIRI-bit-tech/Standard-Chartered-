'use client'

import { useState, useEffect } from 'react'
import { KenBurnsCarousel } from '@/components/ui/ken-burns-carousel'
import { colors } from '@/types'

interface HeroSlide {
  image: string
  tag: string
  title: string
  description: string
}

const heroSlides: HeroSlide[] = [
  {
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=1080&fit=crop',
    tag: 'GLOBAL BANKING EXCELLENCE',
    title: 'Empowering Your Global Financial Future',
    description: 'Secure, worldwide banking at your fingertips. Manage wealth, transfer funds, and grow assets with a partner that spans across 60 markets.'
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop',
    tag: 'DIGITAL BANKING SOLUTIONS',
    title: 'Innovation Meets Tradition',
    description: 'Experience the perfect blend of cutting-edge technology and time-tested banking principles. Your financial journey, reimagined.'
  },
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
    tag: 'WEALTH MANAGEMENT EXPERTISE',
    title: 'Build Your Legacy With Confidence',
    description: 'Strategic financial planning and investment solutions designed to secure your future and maximize your potential.'
  }
]

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroSlides.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [])

  const currentSlide = heroSlides[currentIndex]

  return (
    <section className="relative h-screen -mt-16">
      <KenBurnsCarousel 
        images={heroSlides.map(slide => slide.image)} 
        currentIndex={currentIndex}
        className="pt-16"
      >
        <div className="flex items-center justify-center h-full pt-20">
          <div className="text-center text-white px-4 max-w-4xl mx-auto">
            {/* Tag */}
            <div className="mb-4">
              <span 
                className="px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide"
                style={{ backgroundColor: colors.success }}
              >
                {currentSlide.tag}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              {currentSlide.title}
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto leading-relaxed">
              {currentSlide.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                className="px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: colors.primary }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                Get Started Now
              </button>
              <button 
                className="px-8 py-4 rounded-lg font-semibold text-white transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:bg-white hover:text-gray-900"
                style={{ backgroundColor: 'transparent' }}
              >
                View Wealth Solutions
              </button>
            </div>
          </div>
        </div>
      </KenBurnsCarousel>
    </section>
  )
}

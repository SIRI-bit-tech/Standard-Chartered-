'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface KenBurnsCarouselProps {
  images: string[]
  className?: string
  children?: React.ReactNode
  currentIndex?: number
}

export function KenBurnsCarousel({
  images,
  className,
  children,
  currentIndex = 0
}: KenBurnsCarouselProps) {

  return (
    <div className={cn('relative overflow-hidden h-full', className)}>
      {images.map((image, index) => (
        <div
          key={index}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 transition-transform duration-[10s] ease-in-out',
              index === currentIndex
                ? 'scale-100'
                : 'scale-110'
            )}
          >
            <Image
              src={image}
              alt={`Hero Slide ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
          </div>
        </div>
      ))}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  )
}

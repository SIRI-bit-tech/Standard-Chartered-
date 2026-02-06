'use client'

import { cn } from '@/lib/utils'

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
  currentIndex
}: KenBurnsCarouselProps) {

  return (
    <div className={cn('relative overflow-hidden h-full', className)}>
      {images.map((image, index) => (
        <div
          key={index}
          className={cn(
            'absolute inset-0 transition-opacity duration-1000',
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 bg-cover bg-center transition-transform duration-[10s] ease-in-out',
              index === currentIndex 
                ? 'scale-100' 
                : 'scale-110'
            )}
            style={{ backgroundImage: `url(${image})` }}
          />
        </div>
      ))}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

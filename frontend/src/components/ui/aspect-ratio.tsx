'use client'

import * as React from 'react'

type AspectRatioProps = React.HTMLAttributes<HTMLDivElement> & {
  ratio?: number
}

function AspectRatio({ ratio = 16 / 9, style, children, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ ...style, aspectRatio: String(ratio) }}
      {...props}
    >
      {children}
    </div>
  )
}

export { AspectRatio }

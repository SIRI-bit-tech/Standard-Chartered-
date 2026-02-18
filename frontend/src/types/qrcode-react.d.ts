declare module 'qrcode.react' {
  import * as React from 'react'
  export interface QRCodeProps extends React.SVGProps<SVGSVGElement> {
    value: string
    size?: number
    level?: 'L' | 'M' | 'Q' | 'H'
    bgColor?: string
    fgColor?: string
    includeMargin?: boolean
    imageSettings?: any
    title?: string
    className?: string
  }
  export const QRCodeSVG: React.FC<QRCodeProps>
  export const QRCodeCanvas: React.FC<QRCodeProps>
  const _default: React.FC<QRCodeProps>
  export default _default
}

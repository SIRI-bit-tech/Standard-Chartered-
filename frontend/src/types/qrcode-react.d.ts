declare module 'qrcode.react' {
  import * as React from 'react'
  interface QRCodeCommonProps {
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
  export interface QRCodeSVGProps extends React.SVGProps<SVGSVGElement>, QRCodeCommonProps {}
  export interface QRCodeCanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement>, QRCodeCommonProps {}
  export type QRCodeProps = QRCodeSVGProps | QRCodeCanvasProps
  export const QRCodeSVG: React.FC<QRCodeSVGProps>
  export const QRCodeCanvas: React.FC<QRCodeCanvasProps>
  const _default: React.FC<QRCodeProps>
  export default _default
}

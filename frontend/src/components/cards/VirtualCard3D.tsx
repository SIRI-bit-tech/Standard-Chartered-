 'use client'
 
 import { useEffect, useRef, useState } from 'react'
 import { Wifi } from 'lucide-react'
 import { colors, type VirtualCardSummary } from '@/types'
 
 interface Props {
   card: Pick<VirtualCardSummary, 'card_name' | 'card_number' | 'expiry_month' | 'expiry_year' | 'status' | 'card_type'>
 }
 
export function VirtualCard3D({ card }: Props) {
  const [showBack, setShowBack] = useState(false)
  const timerRef = useRef<number | null>(null)
 
   useEffect(() => {
     return () => {
       if (timerRef.current) window.clearTimeout(timerRef.current)
     }
   }, [])
 
   function flipOnce() {
     if (timerRef.current) window.clearTimeout(timerRef.current)
     setShowBack(true)
     timerRef.current = window.setTimeout(() => setShowBack(false), 5000)
   }
 
  const bg =
    card.card_type === 'debit'
      ? 'linear-gradient(135deg,#003E7E 0%,#0B68C6 50%,#2A8FF5 100%), radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%), radial-gradient(100% 100% at 85% 120%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 60%)'
      : 'linear-gradient(135deg,#0f172a 0%,#1f2937 50%,#111827 100%), radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%), radial-gradient(100% 100% at 85% 120%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 60%)'
 
   const overlay =
     card.status === 'suspended'
       ? 'rgba(0,0,0,0.35)'
       : card.status === 'blocked'
       ? 'rgba(255,0,0,0.25)'
       : 'transparent'
 
  const groups = (card.card_number || '').replace(/\s+/g, '').match(/.{1,4}/g) || []
  const maskedGroups = groups.map((g, i) => (i === 0 || i === groups.length - 1 ? g : '••••'))
  const hasDetails =
    !!card.card_number &&
    !!card.expiry_month &&
    !!card.expiry_year &&
    card.status !== 'pending'
  const expiry = hasDetails
    ? `${String(card.expiry_month).padStart(2, '0')}/${String(card.expiry_year).slice(-2)}`
    : ''
  const name = hasDetails ? (card.card_name || 'CARDHOLDER') : ''

  const Chip = () => (
    <img
      src="/chip.png"
      alt="Chip"
      className="h-12 w-16 object-contain select-none pointer-events-none"
      style={{ background: 'transparent', border: 'none', boxShadow: '0 1px 1px rgba(0,0,0,0.2)' }}
    />
  )
  const brandLogo = card.card_type === 'credit' ? '/mastercard.png' : '/visa.png'

   return (
     <div
      className="relative w-full max-w-[360px] md:max-w-[420px] h-[220px] md:h-[250px] cursor-pointer perspective-1000"
       onClick={flipOnce}
       aria-label="Virtual card preview"
     >
       <div
         className={`absolute inset-0 transition-transform duration-700 preserve-3d ${showBack ? 'rotate-y-180' : ''}`}
         style={{ transformStyle: 'preserve-3d' }}
       >
         <div
           className="absolute inset-0 rounded-xl shadow-lg backface-hidden"
           style={{ background: bg }}
         >
           <div className="absolute inset-0 rounded-xl" style={{ background: overlay }} />
          <div className="flex h-full flex-col justify-between p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Bank" className="h-7 w-auto" style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.35))' }} />
                <span className="text-xs uppercase tracking-wide">{card.card_type}</span>
              </div>
              <div className="flex items-center gap-3">
                <Chip />
                <Wifi className="h-3 w-3 opacity-80" />
              </div>
            </div>
            {hasDetails ? (
              <>
                <div className="grid grid-cols-4 gap-2 font-mono text-base tracking-[0.25em]">
                  {maskedGroups.map((g, idx) => (
                    <span key={idx}>{g}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="opacity-80">VALID THRU</span>
                    <span className="font-mono">{expiry}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={brandLogo} alt="Network" className="h-5 w-auto opacity-90" />
                    <span className="font-semibold">{name}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-end justify-between text-xs">
                <span className="opacity-80">Pending approval</span>
                <img src={brandLogo} alt="Network" className="h-5 w-auto opacity-90" />
              </div>
            )}
          </div>
         </div>
 
         <div
           className="absolute inset-0 rounded-xl shadow-lg backface-hidden rotate-y-180"
           style={{ background: bg }}
         >
          <div className="flex h-full flex-col justify-between p-4 text-white">
            <div className="h-8 w-full rounded-sm bg-black/70" />
            <div className="flex items-center justify-between">
              <div className="h-10 w-32 rounded-sm bg-white/80" />
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-80">CVV</span>
                <span className="font-mono">***</span>
              </div>
            </div>
            <div className="text-[10px] opacity-60">For online use only</div>
          </div>
         </div>
       </div>
       {card.status === 'suspended' && (
         <div className="absolute inset-0 flex items-center justify-center">
           <div className="rounded-md bg-white/90 px-3 py-1 text-xs font-semibold" style={{ color: colors.error }}>
             CARD FROZEN
           </div>
         </div>
       )}
       {card.status === 'blocked' && (
         <div className="absolute inset-0 flex items-center justify-center">
           <div className="rounded-md bg-white/90 px-3 py-1 text-xs font-semibold" style={{ color: colors.error }}>
             CARD BLOCKED
           </div>
         </div>
       )}
     </div>
   )
 }

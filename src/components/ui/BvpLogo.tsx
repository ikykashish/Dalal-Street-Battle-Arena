import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BvpLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'compact'
}

// The source image is 1280 × 428 (~3:1). We pass those true dimensions so the
// aspect ratio is correct (no distortion / no Next.js warning) and control the
// DISPLAY size purely via a fixed height + width:auto.
const NATURAL_W = 1280
const NATURAL_H = 428

const heights: Record<NonNullable<BvpLogoProps['size']>, number> = {
  sm: 32,
  md: 44,
  lg: 60,
  xl: 80,
}

export function BvpLogo({ className, size = 'md' }: BvpLogoProps) {
  const h = heights[size]
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Image
        src="/bvp-logo.png"
        alt="Bharati Vidyapeeth (Deemed to be University) - DMS, Pune"
        width={NATURAL_W}
        height={NATURAL_H}
        className="object-contain"
        style={{ height: `${h}px`, width: 'auto', maxWidth: '100%' }}
        priority
      />
    </div>
  )
}

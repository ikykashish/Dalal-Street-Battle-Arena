import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BvpLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'compact'
}

const sizes = {
  sm:  { w: 180, h: 36  },
  md:  { w: 260, h: 52  },
  lg:  { w: 340, h: 68  },
  xl:  { w: 480, h: 96  },
}

export function BvpLogo({ className, size = 'md', variant = 'full' }: BvpLogoProps) {
  const { w, h } = sizes[size]
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Image
        src="/bvp-logo.png"
        alt="Bharati Vidyapeeth (Deemed to be University) - DMS, Pune"
        width={w}
        height={h}
        className="object-contain"
        priority
      />
    </div>
  )
}

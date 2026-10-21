import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Frosted card that floats over orbs and gradients (design-spec §6, §8).
// Never nest one glass card inside another.
export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-hairline bg-glass p-6 backdrop-blur-glass', className)}
      {...props}
    />
  )
}

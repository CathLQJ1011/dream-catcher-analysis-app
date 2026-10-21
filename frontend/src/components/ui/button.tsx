import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Pill buttons from design-spec §8.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3 text-label transition disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-accent bg-[linear-gradient(135deg,rgb(var(--accent))_30%,rgb(var(--accent-soft)/0.7)_100%)] text-fg shadow-glow hover:brightness-110',
        ghost: 'border border-hairline text-fg-secondary hover:border-fg-muted hover:text-fg',
        danger: 'border border-ember/40 text-ember hover:bg-ember/10',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ variant, className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}

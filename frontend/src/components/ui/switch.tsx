import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-pill border border-hairline transition disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-raised',
      )}
    >
      <span className={cn('absolute top-1 size-5 rounded-pill bg-fg transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

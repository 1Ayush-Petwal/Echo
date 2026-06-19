/**
 * Shared button — the one place primary/secondary/ghost styling lives so
 * every screen stays consistent with the §4 design system.
 */
const VARIANTS = {
  primary:
    'bg-gradient-to-r from-accent to-[#5b82ff] text-white shadow-[0_12px_30px_-10px_var(--color-accent)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_var(--color-accent)]',
  secondary:
    'border border-border bg-surface text-ink shadow-card hover:-translate-y-0.5 hover:border-accent/50',
  ghost: 'text-muted hover:text-ink',
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4',
        'text-base font-bold tracking-tight transition duration-150 active:scale-[0.985]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}

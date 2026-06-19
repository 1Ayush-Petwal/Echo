/**
 * Compact progress for the 5 user-facing steps (Loading folds into Create).
 * The active step is a wide accent pill; past steps stay tinted, future ones
 * are border-grey. Purely presentational — App owns which step is active.
 */
const STEPS = ['Voice', 'Inspiration', 'Audit', 'Create', 'Results']

export default function StepIndicator({ active }) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-1.5">
      {STEPS.map((label, i) => (
        <span
          key={label}
          aria-label={label}
          aria-current={i === active ? 'step' : undefined}
          className={[
            'h-[5px] rounded-full transition-all duration-[450ms] ease-[cubic-bezier(.4,0,.2,1)]',
            i === active
              ? 'w-[30px] bg-gradient-to-r from-accent to-violet'
              : i < active
                ? 'w-[9px] bg-accent/55'
                : 'w-[9px] bg-border',
          ].join(' ')}
        />
      ))}
    </nav>
  )
}

import Button from '../components/Button'
import ScreenScaffold from '../components/ScreenScaffold'

/*
 * Generation error state (§7, CP6) — the flow's safety net. If synthesis fails,
 * the creator lands here instead of a dead screen, with their brief and voice
 * still intact. Nothing fails in the mock, so today this is reached only via the
 * ?fail preview toggle in Loading; CP7 wires it to a real /api/generate reject.
 */
export default function GenerationError({ onRetry, onStartOver }) {
  return (
    <ScreenScaffold
      icon={<AlertIcon />}
      title="That didn't go through"
      subtitle="Echo couldn't compose your kit just now. Give it another try — your brief and brand voice are still saved."
    >
      <Button onClick={onRetry}>Try again</Button>
      <Button variant="ghost" onClick={onStartOver}>
        Start over
      </Button>
    </ScreenScaffold>
  )
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}

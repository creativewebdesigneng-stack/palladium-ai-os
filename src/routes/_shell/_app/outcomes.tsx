import { createFileRoute } from '@tanstack/react-router'
import OutcomePacks from '@/screens/OutcomePacks'

export const Route = createFileRoute('/_shell/_app/outcomes')({
  component: () => <div className="blackstar-core-page"><OutcomePacks /></div>,
})

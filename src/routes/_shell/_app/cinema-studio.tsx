import { createFileRoute } from '@tanstack/react-router'
import CinemaStudio from '@/screens/CinemaStudio'

export const Route = createFileRoute('/_shell/_app/cinema-studio')({ component: CinemaStudio })

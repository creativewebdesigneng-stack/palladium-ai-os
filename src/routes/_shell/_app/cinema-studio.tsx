import { createFileRoute } from '@tanstack/react-router'
import CinemaStudio from '@/screens/CinemaStudio'

export const Route = createFileRoute('/_shell/_app/cinema-studio')({
  head: () => ({
    meta: [
      { title: 'Cinema Studio — Blackstar' },
      {
        name: 'description',
        content: 'Plan, generate, orchestrate and compile governed AI video and film projects through Blackstar Cinema Studio.',
      },
      { property: 'og:title', content: 'Cinema Studio — Blackstar' },
      {
        property: 'og:description',
        content: 'Plan, generate, orchestrate and compile governed AI video and film projects through Blackstar Cinema Studio.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: CinemaStudio,
})

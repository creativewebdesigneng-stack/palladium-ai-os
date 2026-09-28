import { Link } from 'react-router-dom';
import { AstraMark } from '@/components/blackstar/AstraMark';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'AI Agents', to: '/ai-agents' },
      { label: 'Intelligence Hub', to: '/tools' },
      { label: 'Enterprise', to: '/business' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Developer platform', to: '/developers' },
      { label: 'Resources', to: '/resources' },
      { label: 'MCP', to: '/mcp' },
      { label: 'Help centre', to: '/help' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'For business', to: '/business' },
      { label: 'Platform resources', to: '/resources' },
      { label: 'Help & contact', to: '/help' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/legal/privacy-policy' },
      { label: 'Terms', to: '/legal/terms-of-service' },
      { label: 'Security', to: '/legal/security' },
      { label: 'Cookies', to: '/legal/cookie-policy' },
      { label: 'DPA', to: '/legal/data-processing-agreement' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#050508]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <AstraMark size={28} />
              <span className="text-sm font-semibold tracking-[0.18em] text-white">BLACKSTAR</span>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">Void observatory</p>
            <p className="mt-4 max-w-xs text-sm text-zinc-500">Bounded intelligence infrastructure. Astra-class engine under command.</p>
            <Link
              to="/register?returnTo=/dashboard"
              className="mt-5 inline-flex rounded-lg border border-violet-300/15 bg-violet-500/[.07] px-3 py-2 text-xs font-medium text-violet-100 transition hover:border-violet-300/30 hover:bg-violet-500/[.12]"
            >
              Launch Blackstar
            </Link>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{column.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
                {column.links.map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="hover:text-white">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} Blackstar. All rights reserved.</p>
          <p>Void observatory · Not claimed as AGI</p>
        </div>
      </div>
    </footer>
  );
}

import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'Pricing', 'Marketplace', 'Integrations', 'Changelog'] },
    { title: 'Developers', links: ['Documentation', 'API reference', 'SDK', 'Status', 'Open source'] },
    { title: 'Company', links: ['About', 'Careers', 'Blog', 'Press', 'Contact'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies', 'DPA'].map((l, i) => ({ label: l, to: ['/legal/privacy-policy','/legal/terms-of-service','/legal/security','/legal/cookie-policy','/legal/data-processing-agreement'][i] })) },
  ];
  return (
    <footer className="border-t border-white/10 bg-[#070809]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400"><Sparkles className="h-4 w-4 text-white" /></span>
              <span className="text-sm font-semibold text-white">Palladium<span className="text-violet-400">AI</span></span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-zinc-500">The AI operating system for business, developers, and teams.</p>
            <div className="mt-5 flex gap-3 text-zinc-500">
              <a href="#" className="rounded-lg border border-white/10 p-2 hover:text-white">Discord</a>
              <a href="#" className="rounded-lg border border-white/10 p-2 hover:text-white">GitHub</a>
            </div>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">{c.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
                {c.links.map((l) => {
                const item = typeof l === 'string' ? { label: l } : l;
                return (
                  <li key={item.label}>
                    {item.to
                      ? <Link to={item.to} className="hover:text-white">{item.label}</Link>
                      : <a href="#" className="hover:text-white">{item.label}</a>}
                  </li>
                );
              })}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} PalladiumAI. All rights reserved.</p>
          <p>Built for the future of work.</p>
        </div>
      </div>
    </footer>
  );
}
export default function Panel({ title, subtitle, children, className='' }) {
  return <section className={`pglass pmetal-border rounded-2xl p-5 ${className}`}><div className="mb-4"><h2 className="text-sm font-medium text-white">{title}</h2>{subtitle&&<p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}</div>{children}</section>;
}
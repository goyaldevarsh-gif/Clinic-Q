import { type ReactNode, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import type { Status } from '../lib/types';
import { fmtToken } from '../lib/slots';
import { useT, setLang, useLang } from '../lib/i18n';

export function Logo({ size = 28, text = true }: { size?: number; text?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src="logo-mark.svg" width={size} height={size} alt="" />
      {text && <span className="font-extrabold tracking-tight text-primary-dark" style={{ fontSize: size * 0.9 }}>Clinic<span className="text-accent">Q</span></span>}
    </span>
  );
}

export function DemoBanner() {
  return <div className="bg-warn-50 px-3 py-1 text-center text-[11px] font-semibold text-warn">Demo mode · data stays on this device · OTP 123456 · staff PIN 1234</div>;
}

export function LangToggle() {
  const l = useLang();
  return (
    <button className="rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-primary-dark" onClick={() => setLang(l === 'en' ? 'hi' : 'en')} aria-label="Language">
      {l === 'en' ? 'हिं' : 'EN'}
    </button>
  );
}

export function Header({ title, back, right }: { title: ReactNode; back?: boolean | string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-white/95 px-4 py-3 backdrop-blur">
      {back && <button className="-ml-2 rounded-full p-2 hover:bg-slate-100" aria-label="Back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}><ChevronLeft size={22} /></button>}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {right}
    </header>
  );
}

export function StatusChip({ s }: { s: Status }) {
  const t = useT();
  const map = { waiting: 'bg-warn-50 text-warn', seen: 'bg-ok-50 text-ok', cancelled: 'bg-bad-50 text-bad' } as const;
  const label = { waiting: 'Waiting', seen: 'Seen', cancelled: 'Cancelled' }[s];
  return <span className={`chip ${map[s]}`}>{s === 'seen' ? '✓ ' : ''}{t(label)}</span>;
}

export function TokenBadge({ n, big }: { n: number; big?: boolean }) {
  return <span className={`inline-block rounded-xl bg-primary-50 font-extrabold tracking-tight text-primary-dark ${big ? 'px-6 py-2 text-5xl' : 'px-2.5 py-1 text-sm'}`}>{fmtToken(n)}</span>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button className="rounded-full p-1.5 hover:bg-slate-100" onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function TabBar({ items }: { items: { to: string; label: string; icon: ReactNode; end?: boolean }[] }) {
  const t = useT();
  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white">
      <div className="mx-auto flex max-w-xl">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-primary-dark' : 'text-ink-2'}`}>
            {i.icon}{t(i.label)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return <div className="flex flex-col items-center px-6 py-14 text-center"><div className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary">{icon}</div><div className="font-bold">{title}</div>{text && <p className="mt-1 max-w-xs text-sm text-ink-2">{text}</p>}</div>;
}

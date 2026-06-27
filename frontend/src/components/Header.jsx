import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsSun, BsMoon } from 'react-icons/bs';
import { FiGithub, FiMenu, FiSettings, FiX } from 'react-icons/fi';
import { Circle, Sparkles } from 'lucide-react';

const Header = React.memo(function Header({ onToggleSidebar, sidebarOpen, onOpenSettings, onOpenAbout }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((prev) => !prev), []);

  const statusPills = useMemo(
    () => [
      { label: 'Backend online', tone: 'emerald' },
      { label: 'Gemini ready', tone: 'amber' },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[#D3D4C0]/50 bg-white/80 px-3 py-2.5 backdrop-blur-xl shadow-[0_10px_35px_-20px_rgba(10,41,71,0.45)] dark:border-slate-700/70 dark:bg-slate-900/80 sm:px-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9] text-[#0A2947] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-200 lg:hidden"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5E3C] via-[#D3D4C0] to-[#0A2947] shadow-lg shadow-[#8B5E3C]/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-[#0A2947] dark:text-slate-100">SiteLens</p>
            <p className="truncate text-[11px] text-[#12375A] dark:text-slate-400">AI knowledge workspace</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {statusPills.map((pill) => (
            <div
              key={pill.label}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${pill.tone === 'emerald' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-[#8B5E3C]/30 bg-[#8B5E3C]/10 text-[#8B5E3C] dark:text-[#D3D4C0]'}`}
            >
              <Circle className={`h-2.5 w-2.5 fill-current ${pill.tone === 'emerald' ? 'text-emerald-500' : 'text-[#8B5E3C]'}`} />
              {pill.label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAbout}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9] text-[#12375A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-200"
            aria-label="About SiteLens"
          >
            <FiGithub size={18} />
          </button>
          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9] text-[#12375A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-200"
            aria-label="Settings"
          >
            <FiSettings size={18} />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9] text-[#12375A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-200"
            aria-label="Toggle dark mode"
          >
            {dark ? <BsMoon size={18} className="text-[#8B5E3C]" /> : <BsSun size={18} className="text-[#8B5E3C]" />}
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#D3D4C0]/70 bg-[#0A2947] text-sm font-semibold text-[#F3E4C9] shadow-sm sm:flex">
            AK
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;

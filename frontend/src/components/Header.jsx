import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BsSun, BsMoon } from 'react-icons/bs';
import { FiGithub, FiMenu, FiSettings, FiX } from 'react-icons/fi';
import { Circle } from 'lucide-react';

const Header = React.memo(function Header({ onToggleSidebar, sidebarOpen, onOpenSettings, onOpenAbout }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const toggle = useCallback(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    setDark(false);
  }, []);

  const statusPills = useMemo(
    () => [
      { label: 'Backend online', tone: 'primary' },
      { label: 'Workspace ready', tone: 'secondary' },
    ],
    []
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_8px_25px_-18px_rgba(17,24,39,0.2)] transition-colors duration-300 sm:px-4 lg:px-5">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onToggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A2947] hover:bg-[#F8FAFC] hover:shadow-md lg:hidden"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <FiX size={17} /> : <FiMenu size={17} />}
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0A2947] text-sm font-semibold text-white shadow-sm shadow-slate-900/10">
            <span>S</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#111827]">SiteLens</p>
            <p className="truncate text-xs text-[#6B7280]">Modern RAG workspace</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {statusPills.map((pill) => (
            <div
              key={pill.label}
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium ${pill.tone === 'primary' ? 'border-[#0A2947]/15 bg-[#0A2947]/5 text-[#0A2947]' : 'border-[#E5E7EB] bg-white text-[#6B7280]'}`}
            >
              <Circle className={`h-2.5 w-2.5 ${pill.tone === 'primary' ? 'text-[#0A2947]' : 'text-slate-400'}`} />
              {pill.label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAbout}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A2947] hover:bg-[#F8FAFC] hover:shadow-md"
            aria-label="Open GitHub"
          >
            <FiGithub size={17} />
          </button>
          <button
            onClick={onOpenSettings}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A2947] hover:bg-[#F8FAFC] hover:shadow-md"
            aria-label="Open settings"
          >
            <FiSettings size={17} />
          </button>
          <button
            onClick={toggle}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A2947] hover:bg-[#F8FAFC] hover:shadow-md"
            aria-label="Toggle dark mode"
          >
            {dark ? <BsMoon size={17} /> : <BsSun size={17} />}
          </button>
          <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-[#0A2947] text-sm font-semibold text-white shadow-sm sm:flex">
            AK
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;

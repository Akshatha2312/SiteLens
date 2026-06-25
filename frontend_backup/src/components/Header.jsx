import React, { useEffect, useState } from 'react';
import { BsSun, BsMoon } from 'react-icons/bs';
import { FiMessageSquare } from 'react-icons/fi';

export default function Header() {
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

  const toggle = () => setDark(!dark);

  return (
    <header className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 shadow-md">
      <FiMessageSquare className="text-2xl text-blue-500" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SiteLens</h1>
      <button
        onClick={toggle}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        aria-label="Toggle dark mode"
      >
        {dark ? <BsMoon size={24} className="text-yellow-300" /> : <BsSun size={24} className="text-yellow-600" />}
      </button>
    </header>
  );
};

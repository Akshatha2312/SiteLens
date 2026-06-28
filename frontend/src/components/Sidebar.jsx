import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  BarChart3,
  ChevronRight,
  Database,
  Globe2,
  Layers3,
  MessageSquareText,
  PlayCircle,
  Search,
  SendHorizonal,
  Server,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

const pipelineSteps = ['Crawl', 'Process', 'Embed', 'Index', 'Search', 'Ask'];

const Sidebar = React.memo(function Sidebar({
  url,
  setUrl,
  stats,
  sidebarOpen,
  setSidebarOpen,
  handlePipelineAction,
  loadingActions = {},
  websiteHistory,
  selectWebsite,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [askPrompt, setAskPrompt] = useState('');
  const [activeSection, setActiveSection] = useState('url');
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const updateViewport = () => setIsDesktop(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  const isLoading = (action) => Boolean(loadingActions[action]);

  const handleAction = async (action) => {
    if (['crawl', 'process', 'embed', 'index'].includes(action)) {
      return handlePipelineAction(action);
    }

    if (action === 'search') {
      if (!searchQuery.trim()) {
        toast.error('Please enter a search query');
        return;
      }
      await handlePipelineAction('search', { query: searchQuery });
      setSearchQuery('');
      return;
    }

    if (action === 'ask') {
      const currentPrompt = askPrompt.trim();
      if (!currentPrompt) {
        toast.error('Please enter a question');
        return;
      }
      setAskPrompt('');
      await handlePipelineAction('ask', { question: currentPrompt });
      return;
    }
  };

  const buttonClass = (action) =>
    `flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0A2947] shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A2947] hover:text-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50 ${
      isLoading(action) ? 'cursor-wait' : ''
    }`;

  const sectionClass = (section) =>
    `rounded-[20px] border p-3.5 shadow-sm transition duration-200 ${activeSection === section ? 'border-[#0A2947]/20 bg-[#F8FAFC] shadow-[0_12px_30px_-20px_rgba(10,41,71,0.45)]' : 'border-[#E5E7EB] bg-white hover:border-[#0A2947]/20 hover:shadow-md'}`;

  const statCards = useMemo(
    () => [
      { label: 'Pages Crawled', value: stats.pagesCrawled },
      { label: 'Documents Processed', value: stats.documentsProcessed },
      { label: 'Chunks', value: stats.chunks },
      { label: 'Embeddings', value: stats.embeddings },
      { label: 'FAISS Vectors', value: stats.faissVectors },
      { label: 'Questions Asked', value: stats.questionsAsked },
      { label: 'Avg Response Time', value: stats.averageResponseTime },
    ],
    [stats]
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-[#0A2947]/10 backdrop-blur-[1px] transition lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="fixed left-0 top-0 z-30 flex h-screen w-[270px] max-w-[86vw] shrink-0 flex-col gap-3 overflow-y-auto border-r border-[#E5E7EB] bg-white p-3 shadow-[0_20px_45px_-20px_rgba(17,24,39,0.2)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-[270px] lg:max-w-[270px] lg:translate-x-0 lg:rounded-[24px] lg:border lg:p-3.5"
      >
        <div role="button" tabIndex={0} onClick={() => setActiveSection('url')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveSection('url'); } }} className={sectionClass('url')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0A2947]/10 text-[#0A2947]">
              <Globe2 className="h-4 w-4" />
            </div>
            Website URL
          </div>
          <label className="mt-3 block text-sm font-medium text-[#6B7280]" htmlFor="url-input">
            Site URL
          </label>
          <input
            id="url-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#0A2947] focus:ring-2 focus:ring-[#0A2947]/10"
          />
          <button
            type="button"
            onClick={() => handleAction('crawl')}
            disabled={isLoading('crawl') || !url}
            className={`${buttonClass('crawl')} mt-3 w-full border-transparent bg-[#0A2947] text-white hover:bg-[#071c32]`}
          >
            <Server className="h-4 w-4" /> Crawl
          </button>
        </div>

        <div role="button" tabIndex={0} onClick={() => setActiveSection('pipeline')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveSection('pipeline'); } }} className={sectionClass('pipeline')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0A2947]/10 text-[#0A2947]">
              <Layers3 className="h-4 w-4" />
            </div>
            Pipeline Timeline
          </div>
          <div className="mt-3 space-y-2">
            {pipelineSteps.slice(0, 4).map((step, index) => (
              <div key={step} className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#111827] transition hover:border-[#0A2947]/40 hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A2947]/10 text-[#0A2947]">{index + 1}</div>
                    <span>{step}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button type="button" onClick={() => handleAction('process')} disabled={isLoading('process')} className={buttonClass('process')}>
              <PlayCircle className="h-4 w-4" /> Process
            </button>
            <button type="button" onClick={() => handleAction('embed')} disabled={isLoading('embed')} className={buttonClass('embed')}>
              <UploadCloud className="h-4 w-4" /> Embed
            </button>
            <button type="button" onClick={() => handleAction('index')} disabled={isLoading('index')} className={buttonClass('index')}>
              <Database className="h-4 w-4" /> Index
            </button>
          </div>
        </div>

        <div role="button" tabIndex={0} onClick={() => setActiveSection('analytics')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveSection('analytics'); } }} className={sectionClass('analytics')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0A2947]/10 text-[#0A2947]">
              <BarChart3 className="h-4 w-4" />
            </div>
            Analytics
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-3 border-slate-200 bg-slate-50/80">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">{card.label}</p>
                <p className="mt-1 text-base font-semibold text-[#111827]">{card.value ?? '--'}</p>
              </div>
            ))}
          </div>
        </div>

        <div role="button" tabIndex={0} onClick={() => setActiveSection('history')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveSection('history'); } }} className={sectionClass('history')}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0A2947]/10 text-[#0A2947]">
              <Sparkles className="h-4 w-4" />
            </div>
            Recent Websites
          </div>
          <div className="mt-3 space-y-2">
            {(websiteHistory.length ? websiteHistory : [url || 'https://example.com']).map((site) => (
              <button
                key={site}
                type="button"
                onClick={() => selectWebsite(site)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2.5 text-left text-sm text-[#111827] transition hover:border-[#0A2947]/40 hover:bg-white"
              >
                <span className="truncate">{site}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white/90 p-3.5 shadow-sm border-slate-200 bg-white/95">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0A2947]">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0A2947]/10 text-[#0A2947]">
              <MessageSquareText className="h-4 w-4" />
            </div>
            Quick Actions
          </div>
          <div className="mt-3 space-y-2">
            <div className="border-t border-slate-200/70 pt-3 border-slate-200">
              <label className="block text-sm font-medium text-[#111827]" htmlFor="search-input">
                Search
              </label>
              <input
                id="search-input"
                type="text"
                placeholder="Search term"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 text-sm text-[#0A2947] outline-none ring-0 transition focus:border-[#0A2947] border-slate-200/80 bg-slate-50/90 text-slate-700"
              />
              <button
                type="button"
                onClick={() => handleAction('search')}
                disabled={isLoading('search') || !searchQuery}
                className={`${buttonClass('search')} mt-3 w-full`}
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
            <div className="border-t border-slate-200/70 pt-3 border-slate-200">
              <label className="block text-sm font-medium text-[#111827]" htmlFor="ask-input">
                Ask (RAG Chat)
              </label>
              <textarea
                id="ask-input"
                rows={3}
                placeholder="Ask a question..."
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 text-sm text-[#0A2947] outline-none ring-0 transition focus:border-[#0A2947] border-slate-200/80 bg-slate-50/90 text-slate-700"
              />
              <button
                type="button"
                onClick={() => handleAction('ask')}
                disabled={isLoading('ask') || !askPrompt}
                className={`${buttonClass('ask')} mt-3 w-full`}
              >
                <SendHorizonal className="h-4 w-4" /> Ask
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
});

export default Sidebar;

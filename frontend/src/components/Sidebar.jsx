import React, { useMemo, useState } from 'react';
import api from '../services/api';
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
  addMessage,
  stats,
  sidebarOpen,
  setSidebarOpen,
  handleAsk,
  beginPipelineStep,
  completePipelineStep,
  failPipelineStep,
  updateWebsiteInfo,
  addWebsiteToHistory,
  websiteHistory,
  selectWebsite,
  incrementStat,
  getDomain,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [askPrompt, setAskPrompt] = useState('');
  const [loading, setLoading] = useState({});

  const isValidUrl = (value) => {
    if (!value) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handleAction = async (action) => {
    try {
      setLoading((prev) => ({ ...prev, [action]: true }));
      let response;

      switch (action) {
        case 'crawl':
          if (!isValidUrl(url)) {
            failPipelineStep('crawl', 'Please enter a valid website URL');
            toast.error('Please enter a valid website URL');
            return;
          }
          beginPipelineStep('crawl', 'Crawling website');
          response = await api.post('/crawl', { url });
          incrementStat('pagesCrawled');
          incrementStat('documentsProcessed');
          updateWebsiteInfo((prev) => ({
            ...prev,
            currentUrl: url,
            domain: getDomain(url),
            pagesCrawled: prev.pagesCrawled === '--' ? 1 : Number(prev.pagesCrawled) + 1,
            lastCrawlTime: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            processingDuration: 'In progress',
            indexStatus: 'Pending indexing',
          }));
          addWebsiteToHistory(url);
          completePipelineStep('crawl', 'Crawl completed');
          toast.success('Crawl completed');
          break;
        case 'process':
          beginPipelineStep('process', 'Processing content');
          response = await api.post('/process');
          incrementStat('chunks');
          incrementStat('documentsProcessed');
          updateWebsiteInfo((prev) => ({ ...prev, processingDuration: 'Completed', indexStatus: 'Ready for indexing' }));
          completePipelineStep('process', 'Processing complete');
          toast.success('Processing complete');
          break;
        case 'embed':
          beginPipelineStep('embed', 'Generating embeddings');
          response = await api.post('/embed');
          incrementStat('embeddings');
          completePipelineStep('embed', 'Embeddings created');
          toast.success('Embeddings created');
          break;
        case 'index':
          beginPipelineStep('index', 'Building index');
          response = await api.post('/index');
          incrementStat('faissVectors');
          updateWebsiteInfo((prev) => ({ ...prev, indexStatus: 'Indexed' }));
          completePipelineStep('index', 'Index built');
          toast.success('Index built');
          break;
        case 'search':
          addMessage('user', `Search query: "${searchQuery}"`);
          beginPipelineStep('search', 'Searching knowledge base');
          response = await api.post('/search', { query: searchQuery });
          completePipelineStep('search', 'Search completed');
          toast.success('Search completed');
          addMessage('assistant', `Search results: ${JSON.stringify(response.data.results, null, 2)}`);
          setSearchQuery('');
          break;
        case 'ask':
          const currentPrompt = askPrompt;
          setAskPrompt('');
          await handleAsk(currentPrompt);
          break;
        default:
          break;
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Request failed';
      failPipelineStep(action, `${action} failed: ${detail}`);
      toast.error(`${action} failed: ${detail}`);
    } finally {
      setLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const buttonClass = (action) =>
    `flex items-center justify-center gap-2 rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9] px-4 py-2.5 text-sm font-semibold text-[#0A2947] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 ${
      loading[action] ? 'cursor-wait' : ''
    }`;

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
        className={`fixed inset-0 z-20 bg-slate-950/35 backdrop-blur-sm transition lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="fixed left-0 top-0 z-30 flex h-screen w-[92vw] max-w-sm flex-col gap-3 overflow-y-auto border-r border-[#D3D4C0]/70 bg-white/80 p-3 shadow-2xl shadow-[#0A2947]/10 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/80 dark:shadow-slate-950/50 lg:static lg:h-auto lg:w-96 lg:translate-x-0 lg:rounded-[24px] lg:border lg:border-[#D3D4C0]/70 lg:bg-white/70 lg:p-4 lg:shadow-[0_20px_60px_-20px_rgba(10,41,71,0.25)]"
      >
        <div className="rounded-[22px] border border-[#D3D4C0]/70 bg-gradient-to-br from-[#0A2947] via-[#12375A] to-[#8B5E3C] p-3.5 text-white shadow-lg shadow-[#0A2947]/15 dark:border-slate-700/70">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 className="h-4 w-4 text-[#D3D4C0]" />
            Website URL
          </div>
          <label className="mt-3 block text-sm font-medium text-[#D3D4C0]" htmlFor="url-input">
            Site URL
          </label>
          <input
            id="url-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/95 px-3 py-2.5 text-sm text-[#0A2947] outline-none ring-0 transition focus:border-[#D3D4C0] dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={() => handleAction('crawl')}
            disabled={loading.crawl || !url}
            className={`${buttonClass('crawl')} mt-3 w-full`}
          >
            <Server className="h-4 w-4" /> Crawl
          </button>
        </div>

        <div className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/70 p-3.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0A2947] dark:text-slate-200">
            <Layers3 className="h-4 w-4 text-[#8B5E3C]" />
            Pipeline Timeline
          </div>
          <div className="mt-3 space-y-2">
            {pipelineSteps.map((step) => (
              <div key={step} className="rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9]/70 px-3 py-2.5 text-sm text-[#12375A] dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">✓</div>
                    {step}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button type="button" onClick={() => handleAction('process')} disabled={loading.process} className={buttonClass('process')}>
              <PlayCircle className="h-4 w-4" /> Process
            </button>
            <button type="button" onClick={() => handleAction('embed')} disabled={loading.embed} className={buttonClass('embed')}>
              <UploadCloud className="h-4 w-4" /> Embed
            </button>
            <button type="button" onClick={() => handleAction('index')} disabled={loading.index} className={buttonClass('index')}>
              <Database className="h-4 w-4" /> Index
            </button>
          </div>
        </div>

        <div className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/70 p-3.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0A2947] dark:text-slate-200">
            <BarChart3 className="h-4 w-4 text-[#8B5E3C]" />
            Analytics
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9]/70 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#12375A]">{card.label}</p>
                <p className="mt-1 text-lg font-semibold text-[#0A2947] dark:text-slate-100">{card.value ?? '--'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/70 p-3.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0A2947] dark:text-slate-200">
            <Sparkles className="h-4 w-4 text-[#8B5E3C]" />
            Recent Websites
          </div>
          <div className="mt-3 space-y-2">
            {(websiteHistory.length ? websiteHistory : [url || 'https://example.com']).map((site) => (
              <button
                key={site}
                type="button"
                onClick={() => selectWebsite(site)}
                className="flex w-full items-center justify-between rounded-2xl border border-[#D3D4C0]/70 bg-[#F3E4C9]/70 px-3 py-2.5 text-left text-sm text-[#12375A] transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300"
              >
                <span className="truncate">{site}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/70 p-3.5 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0A2947] dark:text-slate-200">
            <MessageSquareText className="h-4 w-4 text-[#8B5E3C]" />
            Quick Actions
          </div>
          <div className="mt-3 space-y-2">
            <div className="border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
              <label className="block text-sm font-medium text-[#12375A] dark:text-slate-300" htmlFor="search-input">
                Search
              </label>
              <input
                id="search-input"
                type="text"
                placeholder="Search term"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D3D4C0]/70 bg-white/95 px-3 py-2.5 text-sm text-[#0A2947] outline-none ring-0 transition focus:border-[#8B5E3C] dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => handleAction('search')}
                disabled={loading.search || !searchQuery}
                className={`${buttonClass('search')} mt-3 w-full`}
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
            <div className="border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
              <label className="block text-sm font-medium text-[#12375A] dark:text-slate-300" htmlFor="ask-input">
                Ask (RAG Chat)
              </label>
              <textarea
                id="ask-input"
                rows={3}
                placeholder="Ask a question..."
                value={askPrompt}
                onChange={(e) => setAskPrompt(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#D3D4C0]/70 bg-white/95 px-3 py-2.5 text-sm text-[#0A2947] outline-none ring-0 transition focus:border-[#8B5E3C] dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => handleAction('ask')}
                disabled={loading.ask || !askPrompt}
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

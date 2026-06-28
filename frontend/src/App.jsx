import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { Toaster, toast } from 'sonner';
import api from './services/api';

const initialStats = {
  pagesCrawled: '--',
  documentsProcessed: '--',
  chunks: '--',
  embeddings: '--',
  faissVectors: '--',
  questionsAsked: '--',
  averageResponseTime: '--',
  backendStatus: 'Online',
};

const initialWebsiteInfo = {
  currentUrl: '',
  domain: '--',
  pagesCrawled: '--',
  lastCrawlTime: '--',
  processingDuration: '--',
  indexStatus: 'Not indexed',
};

const initialPipelineState = {
  currentStep: 'idle',
  progress: 0,
  status: 'idle',
  elapsedMs: 0,
  completedSteps: [],
  message: 'Ready',
};

function getDomain(value) {
  if (!value) return '--';
  try {
    return new URL(value).hostname.replace('www.', '');
  } catch {
    return value;
  }
}

function createMessageId() {
  return globalThis.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [websiteInfo, setWebsiteInfo] = useState(initialWebsiteInfo);
  const [pipelineState, setPipelineState] = useState(initialPipelineState);
  const [websiteHistory, setWebsiteHistory] = useState([]);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [recentAnswers, setRecentAnswers] = useState([]);
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [uiError, setUiError] = useState(null);
  const timeoutRefs = useRef([]);

  useEffect(() => () => {
    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedHistory = JSON.parse(localStorage.getItem('sitelens-websites') || '[]');
      const storedQuestions = JSON.parse(localStorage.getItem('sitelens-questions') || '[]');
      const storedAnswers = JSON.parse(localStorage.getItem('sitelens-answers') || '[]');
      const storedBookmarks = JSON.parse(localStorage.getItem('sitelens-bookmarks') || '[]');
      const storedPreferences = JSON.parse(localStorage.getItem('sitelens-preferences') || '{}');
      if (Array.isArray(storedHistory)) setWebsiteHistory(storedHistory.slice(0, 5));
      if (Array.isArray(storedQuestions)) setRecentQuestions(storedQuestions.slice(0, 10));
      if (Array.isArray(storedAnswers)) setRecentAnswers(storedAnswers.slice(0, 8));
      if (Array.isArray(storedBookmarks)) setBookmarkedMessageIds(storedBookmarks);
      if (storedPreferences && typeof storedPreferences === 'object') {
        setAutoScrollEnabled(storedPreferences.autoScroll !== false);
        setAnimationsEnabled(storedPreferences.animations !== false);
      }
    } catch {
      // Keep the UI resilient when persisted state is unavailable.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sitelens-websites', JSON.stringify(websiteHistory.slice(0, 5)));
  }, [websiteHistory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sitelens-questions', JSON.stringify(recentQuestions.slice(0, 10)));
  }, [recentQuestions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sitelens-answers', JSON.stringify(recentAnswers.slice(0, 8)));
  }, [recentAnswers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sitelens-bookmarks', JSON.stringify(bookmarkedMessageIds));
  }, [bookmarkedMessageIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sitelens-preferences', JSON.stringify({ autoScroll: autoScrollEnabled, animations: animationsEnabled }));
  }, [autoScrollEnabled, animationsEnabled]);

  useEffect(() => {
    if (pipelineState.status !== 'running') return undefined;
    const interval = window.setInterval(() => {
      setPipelineState((prev) => ({
        ...prev,
        elapsedMs: prev.elapsedMs + 1000,
        progress: Math.min(95, prev.progress + 1),
      }));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pipelineState.status]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  const addMessage = (messageOrRole, content) => {
    const baseMessage = typeof messageOrRole === 'object'
      ? messageOrRole
      : {
          role: messageOrRole,
          content,
          timestamp: new Date().toISOString(),
        };

    const message = {
      ...baseMessage,
      id: baseMessage.id || createMessageId(),
      timestamp: baseMessage.timestamp || new Date().toISOString(),
      bookmarked: Boolean(baseMessage.bookmarked),
    };

    setMessages((prev) => [...prev, message]);
    return message;
  };

  const clearChat = () => {
    setMessages([]);
    setIsThinking(false);
    setUiError(null);
  };

  const incrementStat = (key, amount = 1) => {
    setStats((prev) => {
      const currentValue = prev[key];
      if (currentValue === '--' || currentValue === undefined) {
        return { ...prev, [key]: amount };
      }

      const numericValue = Number(currentValue);
      if (!Number.isNaN(numericValue)) {
        return { ...prev, [key]: numericValue + amount };
      }

      return prev;
    });
  };

  const scheduleReset = (callback, delay) => {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutRefs.current.push(timeoutId);
    return timeoutId;
  };

  const beginPipelineStep = (step, label = 'Working on the request') => {
    setPipelineState({
      currentStep: step,
      progress: 10,
      status: 'running',
      elapsedMs: 0,
      completedSteps: [],
      message: label,
    });
  };

  const completePipelineStep = (step, label, meta = {}) => {
    setPipelineState((prev) => ({
      ...prev,
      currentStep: step,
      progress: 100,
      status: 'success',
      completedSteps: prev.completedSteps.includes(step) ? prev.completedSteps : [...prev.completedSteps, step],
      message: label,
      ...meta,
    }));
    scheduleReset(() => {
      setPipelineState((prev) => ({
        ...prev,
        status: 'idle',
        progress: 100,
        currentStep: 'idle',
        message: 'Ready',
      }));
    }, 1200);
  };

  const failPipelineStep = (step, label) => {
    setPipelineState({
      currentStep: step,
      progress: 0,
      status: 'error',
      elapsedMs: 0,
      completedSteps: [],
      message: label,
    });
    scheduleReset(() => {
      setPipelineState((prev) => ({
        ...prev,
        status: 'idle',
        progress: 0,
        currentStep: 'idle',
        message: 'Ready',
      }));
    }, 1400);
  };

  const addWebsiteToHistory = (site) => {
    const normalized = site?.trim();
    if (!normalized) return;
    setWebsiteHistory((prev) => {
      const withoutDuplicate = prev.filter((entry) => entry !== normalized);
      return [normalized, ...withoutDuplicate].slice(0, 5);
    });
  };

  const addRecentQuestion = (question) => {
    const normalized = question?.trim();
    if (!normalized) return;
    setRecentQuestions((prev) => {
      const withoutDuplicate = prev.filter((entry) => entry !== normalized);
      return [normalized, ...withoutDuplicate].slice(0, 10);
    });
  };

  const addRecentAnswer = (answer) => {
    const normalized = answer?.trim();
    if (!normalized) return;
    setRecentAnswers((prev) => {
      const withoutDuplicate = prev.filter((entry) => entry !== normalized);
      return [normalized, ...withoutDuplicate].slice(0, 8);
    });
  };

  const toggleBookmark = (id) => {
    setBookmarkedMessageIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]));
  };

  const clearHistory = () => {
    setWebsiteHistory([]);
    setRecentQuestions([]);
    setRecentAnswers([]);
    setBookmarkedMessageIds([]);
    localStorage.removeItem('sitelens-websites');
    localStorage.removeItem('sitelens-questions');
    localStorage.removeItem('sitelens-answers');
    localStorage.removeItem('sitelens-bookmarks');
    toast.success('Local history cleared');
  };

  const resetDashboard = () => {
    setStats(initialStats);
    setWebsiteInfo(initialWebsiteInfo);
    setPipelineState(initialPipelineState);
    setUrl('');
    setMessages([]);
    setIsThinking(false);
    setUiError(null);
    toast.success('Dashboard reset');
  };

  const selectWebsite = (site) => {
    setUrl(site);
    setSidebarOpen(false);
  };

  const selectQuestion = (question) => {
    window.dispatchEvent(new CustomEvent('sitelens-select-question', { detail: question }));
  };

  const isValidUrl = (value) => {
    if (!value) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const handlePipelineAction = async (action, options = {}) => {
    setLoadingActions((prev) => ({ ...prev, [action]: true }));
    try {
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
          setWebsiteInfo((prev) => ({
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
          setWebsiteInfo((prev) => ({ ...prev, processingDuration: 'Completed', indexStatus: 'Ready for indexing' }));
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
          setWebsiteInfo((prev) => ({ ...prev, indexStatus: 'Indexed' }));
          completePipelineStep('index', 'Index built');
          toast.success('Index built');
          break;
        case 'search':
          if (!options.query?.trim()) {
            toast.error('Please enter a search query');
            return;
          }
          addMessage('user', `Search query: "${options.query.trim()}"`);
          beginPipelineStep('search', 'Searching knowledge base');
          response = await api.post('/search', { query: options.query.trim() });
          completePipelineStep('search', 'Search completed');
          toast.success('Search completed');
          addMessage('assistant', `Search results: ${JSON.stringify(response.data.results || response.data, null, 2)}`);
          break;
        case 'ask':
          if (!options.question?.trim()) {
            toast.error('Please enter a question');
            return;
          }
          await handleAsk(options.question.trim(), options);
          break;
        default:
          break;
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Request failed';
      failPipelineStep(action, `${action} failed: ${detail}`);
      toast.error(`${action} failed: ${detail}`);
      setUiError({ title: `${action} failed`, explanation: detail, retryAction: () => handlePipelineAction(action, options) });
    } finally {
      setLoadingActions((prev) => ({ ...prev, [action]: false }));
    }
  };

  const exportChatMarkdown = () => {
    const markdown = messages
      .map((message) => {
        const role = message.role === 'assistant' ? 'Assistant' : 'You';
        return `## ${role}\n${message.content}`;
      })
      .join('\n\n');

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitelens-chat.md';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown export ready');
  };

  const exportChatPdf = () => {
    const markdown = messages
      .map((message) => {
        const role = message.role === 'assistant' ? 'Assistant' : 'You';
        return `${role}: ${message.content}`;
      })
      .join('\n\n');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for PDF export.');
      return;
    }

    printWindow.document.write(`<!doctype html><html><head><title>SiteLens chat export</title><style>body{font-family:Inter,Segoe UI,sans-serif;padding:24px;line-height:1.6;}h1{margin-bottom:16px;}</style></head><body><h1>SiteLens Chat Export</h1><pre>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleAsk = async (prompt, options = {}) => {
    const question = prompt?.trim();
    if (!question) return null;

    if (!options.regenerate) {
      addMessage({
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      });
    }

    addRecentQuestion(question);
    beginPipelineStep('ask', 'Generating response');
    setIsThinking(true);
    setUiError(null);

    try {
      const startedAt = performance.now();
      const response = await api.post('/ask', { question });
      const duration = `${Math.round(performance.now() - startedAt)}ms`;

      setStats((prev) => ({
        ...prev,
        questionsAsked: prev.questionsAsked === '--' ? 1 : Number(prev.questionsAsked) + 1,
        averageResponseTime: duration,
        backendStatus: 'Online',
      }));

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer || JSON.stringify(response.data),
        timestamp: new Date().toISOString(),
        question,
        sources: response.data.sources || response.data.source_documents || response.data.documents || null,
        similarity: response.data.similarity_score || response.data.similarity || response.data.score || null,
        retrievedChunks: response.data.retrieved_chunks || response.data.chunk_count || response.data.chunks || (Array.isArray(response.data.sources) ? response.data.sources.length : null),
        responseTime: duration,
      };

      addMessage(assistantMessage);
      addRecentAnswer(assistantMessage.content);
      completePipelineStep('ask', 'Answer generated', { elapsedMs: 0 });
      toast.success('Answer generated');
      return assistantMessage;
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Request failed';
      failPipelineStep('ask', `Ask failed: ${detail}`);
      setUiError({
        title: 'Answer request failed',
        explanation: detail,
        retryAction: () => handleAsk(question),
      });
      toast.error(`Ask failed: ${detail}`);
      return null;
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col bg-white text-[#0A2947] transition-colors duration-300">
      <Header
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-3 sm:px-5 lg:flex-row lg:px-6 lg:py-4">
        <Sidebar
          url={url}
          setUrl={setUrl}
          stats={stats}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handlePipelineAction={handlePipelineAction}
          loadingActions={loadingActions}
          websiteHistory={websiteHistory}
          selectWebsite={selectWebsite}
        />
        <Chat
          url={url}
          setUrl={setUrl}
          onPipelineAction={handlePipelineAction}
          loadingActions={loadingActions}
          messages={messages}
          stats={stats}
          isThinking={isThinking}
          handleAsk={handleAsk}
          clearChat={clearChat}
          websiteInfo={websiteInfo}
          pipelineState={pipelineState}
          websiteHistory={websiteHistory}
          recentQuestions={recentQuestions}
          recentAnswers={recentAnswers}
          onSelectWebsite={selectWebsite}
          onSelectQuestion={selectQuestion}
          uiError={uiError}
          clearUiError={() => setUiError(null)}
          bookmarkedMessageIds={bookmarkedMessageIds}
          toggleBookmark={toggleBookmark}
          onExportMarkdown={exportChatMarkdown}
          onExportPdf={exportChatPdf}
          autoScrollEnabled={autoScrollEnabled}
          animationsEnabled={animationsEnabled}
        />
      </div>
      <footer className="mx-auto mt-4 flex w-full max-w-7xl flex-col gap-3 rounded-[24px] border border-[#D3D4C0] bg-white/95 px-4 py-4 text-sm text-[#8B5E3C] shadow-[0_16px_36px_-24px_rgba(10,41,71,0.35)] sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:mb-4">
        <div>
          <p className="font-semibold text-[#0A2947]">SiteLens</p>
          <p className="mt-0.5 text-sm text-[#8B5E3C]">Version 1.0.0 • Build status: stable • Backend online</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="rounded-full border border-[#D3D4C0] bg-[#F3E4C9] px-3 py-1 text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947]">
            GitHub
          </a>
          <span className="text-[#8B5E3C]">© 2026 SiteLens</span>
        </div>
      </footer>

      <AnimatePresence>
        {settingsOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2947]/10 px-4 py-6 ">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-lg rounded-[28px] border border-[#D3D4C0] bg-white p-6 shadow-[0_20px_45px_-20px_rgba(10,41,71,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947] text-[#0A2947]">Settings</p>
                  <p className="mt-1 text-sm text-[#8B5E3C] text-[#8B5E3C]">Fine-tune the workspace for your workflow.</p>
                </div>
                <button onClick={() => setSettingsOpen(false)} className="rounded-full border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-1.5 text-sm font-medium text-[#0A2947] transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#0A2947]">Close</button>
              </div>
              <div className="mt-5 space-y-4">
                <label className="flex items-center justify-between rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-3 text-sm text-[#0A2947] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]">
                  <span>Auto-scroll</span>
                  <input type="checkbox" checked={autoScrollEnabled} onChange={() => setAutoScrollEnabled((prev) => !prev)} className="h-4 w-4 rounded border-[#0A2947] text-[#0A2947]" />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-3 text-sm text-[#0A2947] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]">
                  <span>Animations</span>
                  <input type="checkbox" checked={animationsEnabled} onChange={() => setAnimationsEnabled((prev) => !prev)} className="h-4 w-4 rounded border-[#0A2947] text-[#0A2947]" />
                </label>
                <button onClick={clearHistory} className="flex w-full items-center justify-between rounded-2xl border border-[#D3D4C0] bg-white/80 px-3 py-3 text-sm text-[#0A2947] transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]">
                  <span>Clear local history</span>
                  <span className="text-xs text-[#8B5E3C]">Local storage</span>
                </button>
                <button onClick={resetDashboard} className="flex w-full items-center justify-between rounded-2xl border border-[#D3D4C0] bg-white/80 px-3 py-3 text-sm text-[#0A2947] transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]">
                  <span>Reset dashboard</span>
                  <span className="text-xs text-[#8B5E3C]">Restore defaults</span>
                </button>
                <div className="rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-3 text-sm text-[#0A2947] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]">
                  <p className="font-medium text-[#0A2947] text-[#0A2947]">Application version</p>
                  <p className="mt-1">v1.0.0 • Frontend polished for demos</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {aboutOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A2947]/10 px-4 py-6 ">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="w-full max-w-lg rounded-[24px] border border-[#D3D4C0] bg-white p-6 shadow-[0_20px_45px_-20px_rgba(10,41,71,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947] text-[#0A2947]">About SiteLens</p>
                  <p className="mt-1 text-sm text-[#8B5E3C] text-[#8B5E3C]">RAG-powered website chatbot with a premium AI SaaS shell.</p>
                </div>
                <button onClick={() => setAboutOpen(false)} className="rounded-full border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-1.5 text-sm font-medium text-[#0A2947] transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#0A2947]">Close</button>
              </div>
              <div className="mt-5 space-y-4 text-sm text-[#8B5E3C] text-[#8B5E3C]">
                <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0] bg-[#FFFFFF]/80">
                  <p className="font-semibold text-[#0A2947] text-[#0A2947]">SiteLens</p>
                  <p className="mt-1">A modern RAG-powered website chatbot for exploring crawled content through chat, search, and analytics.</p>
                </div>
                <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0] bg-[#FFFFFF]/80">
                  <p className="font-semibold text-[#0A2947] text-[#0A2947]">Technology stack</p>
                  <p className="mt-1">Frontend: React, Vite, Tailwind, Framer Motion, Sonner</p>
                  <p>Backend: FastAPI, Gemini, FAISS, LangChain</p>
                </div>
                <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0] bg-[#FFFFFF]/80">
                  <p className="font-semibold text-[#0A2947] text-[#0A2947]">Developer</p>
                  <p className="mt-1">Built as a polished AI demo application for hackathons and portfolios.</p>
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[#0A2947]">GitHub placeholder</a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Toaster richColors position="top-right" />
    </div>
  );
}

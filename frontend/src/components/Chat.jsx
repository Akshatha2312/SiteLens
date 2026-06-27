import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowUp,
  Bot,
  Bookmark,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  DatabaseZap,
  Download,
  FileSearch,
  LoaderCircle,
  MessageCircleMore,
  RefreshCw,
  Rocket,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function AnimatedValue({ value }) {
  return (
    <motion.span key={String(value)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {value ?? '--'}
    </motion.span>
  );
}

function renderInlineContent(content) {
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderMarkdownContent(content) {
  const lines = content.split('\n');
  const elements = [];
  let bulletBuffer = [];

  const flushBullets = () => {
    if (bulletBuffer.length) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7">
          {bulletBuffer.map((item, idx) => (
            <li key={`${item}-${idx}`}>{renderInlineContent(item)}</li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      elements.push(<div key={`sp-${index}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith('- ')) {
      bulletBuffer.push(trimmed.replace('- ', ''));
      return;
    }

    flushBullets();
    elements.push(
      <p key={`p-${index}`} className="text-sm leading-7 text-slate-700 dark:text-slate-200">
        {renderInlineContent(trimmed)}
      </p>
    );
  });

  flushBullets();
  return elements;
}

export default function Chat({ messages, stats, isThinking, handleAsk, clearChat, websiteInfo, pipelineState, websiteHistory, recentQuestions, recentAnswers = [], onSelectWebsite, onSelectQuestion, uiError, clearUiError, bookmarkedMessageIds = [], toggleBookmark, onExportMarkdown, onExportPdf, autoScrollEnabled = true, animationsEnabled = true }) {
  const bottomRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const shouldAnimate = animationsEnabled !== false;

  useEffect(() => {
    if (!autoScrollEnabled) return;
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, autoScrollEnabled]);

  useEffect(() => {
    const handleSelection = (event) => {
      if (event.detail) {
        setInputValue(event.detail);
      }
    };

    window.addEventListener('sitelens-select-question', handleSelection);
    return () => window.removeEventListener('sitelens-select-question', handleSelection);
  }, []);

  const exampleUrls = ['https://vercel.com', 'https://notion.so', 'https://openai.com'];
  const exampleQuestions = [
    'What is this website about?',
    'Summarize the content',
    'What services does this company provide?',
    'Give me key highlights',
  ];
  const timelineSteps = ['crawl', 'process', 'embed', 'index', 'search', 'ask'];
  const timelineLabels = {
    crawl: 'Crawl',
    process: 'Process',
    embed: 'Embed',
    index: 'Index',
    search: 'Search',
    ask: 'Ask',
  };

  const metricCards = [
    { label: 'Pages Crawled', value: stats.pagesCrawled },
    { label: 'Documents Processed', value: stats.documentsProcessed },
    { label: 'Chunks Generated', value: stats.chunks },
    { label: 'Embeddings Created', value: stats.embeddings },
    { label: 'FAISS Vectors', value: stats.faissVectors },
    { label: 'Questions Asked', value: stats.questionsAsked },
    { label: 'Avg Response Time', value: stats.averageResponseTime },
    { label: 'Backend Status', value: stats.backendStatus },
  ];

  const submitQuestion = async (prompt, options = {}) => {
    const value = prompt?.trim();
    if (!value) return;

    if (!options.regenerate) {
      setInputValue('');
    }

    await handleAsk(value, options);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitQuestion(inputValue);
    }
  };

  const copyAnswer = async (content, id) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Answer copied');
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      toast.error('Unable to copy answer');
    }
  };

  const handleFeedback = (id, type) => {
    setFeedback((prev) => ({ ...prev, [id]: type }));
  };

  return (
    <section className="flex-1 overflow-hidden rounded-[24px] border border-[#D3D4C0]/70 bg-white/70 shadow-[0_20px_60px_-25px_rgba(10,41,71,0.25)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onExportMarkdown} className="flex items-center gap-2 rounded-full border border-[#D3D4C0]/70 bg-[#F3E4C9] px-3 py-2 text-sm font-medium text-[#0A2947] transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">
              <Download className="h-4 w-4" />
              Export .md
            </button>
            <button type="button" onClick={onExportPdf} className="flex items-center gap-2 rounded-full border border-[#D3D4C0]/70 bg-[#F3E4C9] px-3 py-2 text-sm font-medium text-[#0A2947] transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <div className="ml-auto rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {bookmarkedMessageIds.length} saved insights
            </div>
          </div>

          {uiError ? (
            <div className="mb-6 rounded-[24px] border border-rose-200/80 bg-rose-50/90 p-4 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/40">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{uiError.title}</p>
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-200">{uiError.explanation}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={uiError.retryAction} className="rounded-full border border-rose-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/50 dark:text-rose-200">Try again</button>
                <button type="button" onClick={clearUiError} className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">Dismiss</button>
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-gradient-to-br from-[#0A2947] via-[#12375A] to-[#8B5E3C] p-4 text-white shadow-xl shadow-[#0A2947]/15">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-300">Pipeline Health</p>
                  <h3 className="mt-2 text-xl font-semibold">Live analytics workspace</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Monitor crawl progress, indexing activity, and conversation insights in one place.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
                  <Activity className="h-5 w-5 text-sky-300" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Backend {stats.backendStatus || 'Online'}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
                  Gemini ready
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
                  FAISS ready
                </div>
              </div>
            </motion.div>

            <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live pipeline</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current step and completion state</p>
                </div>
                <div className="rounded-full bg-sky-500/10 p-2 text-sky-500">
                  <Rocket className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{pipelineState.message}</span>
                  <span>{pipelineState.progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div animate={{ width: `${pipelineState.progress}%` }} className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  Elapsed {Math.round(pipelineState.elapsedMs / 1000)}s
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <motion.div key={card.label} layout initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[20px] border border-[#D3D4C0]/70 bg-white/80 p-3.5 shadow-sm transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/80">
                <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  <AnimatedValue value={card.value ?? '--'} />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mb-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pipeline timeline</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">A clear view of each stage and its state</p>
                </div>
                <div className="rounded-full bg-violet-500/10 p-2 text-violet-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {timelineSteps.map((step, index) => {
                  const isActive = pipelineState.currentStep === step && pipelineState.status === 'running';
                  const isComplete = pipelineState.completedSteps.includes(step);
                  return (
                    <div key={step} className={`rounded-2xl border px-3 py-3 ${isActive ? 'border-sky-400 bg-sky-50/80 dark:border-sky-800 dark:bg-sky-900/20' : isComplete ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-900/20' : 'border-slate-200/70 bg-slate-50/80 dark:border-slate-700/70 dark:bg-slate-800/80'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isComplete ? 'bg-emerald-500 text-white' : isActive ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{timelineLabels[step]}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{isActive ? 'In progress' : isComplete ? 'Completed' : 'Queued'}</p>
                          </div>
                        </div>
                        {index < timelineSteps.length - 1 ? <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Website information</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current crawl context</p>
                </div>
                <div className="rounded-full bg-sky-500/10 p-2 text-sky-500">
                  <FileSearch className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Current URL</p>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{websiteInfo.currentUrl || 'No site selected yet'}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Domain</p>
                    <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{websiteInfo.domain}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pages crawled</p>
                    <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{websiteInfo.pagesCrawled}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Last crawl</p>
                    <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{websiteInfo.lastCrawlTime}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/80">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Index status</p>
                    <p className="mt-1 font-medium text-slate-800 dark:text-slate-100">{websiteInfo.indexStatus}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent websites</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Jump back into a previous crawl instantly</p>
                </div>
                <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
                  <DatabaseZap className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(websiteHistory.length ? websiteHistory : [websiteInfo.currentUrl || 'https://example.com']).map((site) => (
                  <button key={site} type="button" onClick={() => onSelectWebsite(site)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 text-left text-sm text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300">
                    <span className="truncate">{site}</span>
                    <span className="text-xs text-slate-400">Reload</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent questions</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Reuse the last prompts you asked</p>
                </div>
                <div className="rounded-full bg-sky-500/10 p-2 text-sky-500">
                  <MessageCircleMore className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {recentQuestions.length ? recentQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => onSelectQuestion(question)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 text-left text-sm text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300">
                    <span className="truncate">{question}</span>
                    <span className="text-xs text-slate-400">Reuse</span>
                  </button>
                )) : <p className="text-sm text-slate-500 dark:text-slate-400">No recent prompts yet.</p>}
              </div>
              <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent answers</p>
                <div className="mt-2 space-y-2">
                  {recentAnswers.length ? recentAnswers.slice(0, 3).map((answer) => (
                    <div key={answer} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/80 dark:text-slate-300">
                      <p className="line-clamp-2">{answer}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500 dark:text-slate-400">No answers saved yet.</p>}
                </div>
              </div>
            </motion.div>
          </div>

          {messages.length === 0 && !isThinking ? (
            <div className="flex h-full flex-col justify-center gap-6">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D3D4C0]/70 bg-[#F3E4C9]/80 px-3 py-1 text-sm font-medium text-[#12375A] dark:text-sky-300">
                    <Sparkles className="h-4 w-4" />
                    Premium AI research workspace
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                      Ask anything about your crawled website.
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                      Crawl a site, turn it into context, and ask grounded questions with a polished chat experience.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-800/80">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Example URLs</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exampleUrls.map((url) => (
                        <span key={url} className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">
                          {url}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Example questions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exampleQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => setInputValue(question)}
                          className="rounded-full bg-gradient-to-r from-[#0A2947] to-[#8B5E3C] px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-[#0A2947]/15 transition hover:-translate-y-0.5"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#D3D4C0]/70 bg-gradient-to-br from-[#F3E4C9]/70 via-white to-[#D3D4C0]/50 p-5 shadow-inner dark:border-slate-700/70">
                  <div className="flex h-full min-h-[280px] flex-col justify-between rounded-[22px] border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live overview</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Your pipeline and insights stay in one place.</p>
                      </div>
                      <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                        <MessageCircleMore className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      {[
                        { label: 'Pages Crawled', value: stats.pagesCrawled },
                        { label: 'Embeddings', value: stats.embeddings },
                        { label: 'Response Time', value: stats.responseTime },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 dark:border-slate-700/70 dark:bg-slate-800/80">
                          <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.value ?? '--'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-[22px] border border-dashed border-slate-300/70 p-4 text-center text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                      Start by entering a website and launching the pipeline.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const messageId = msg.id || `${msg.role}-${idx}`;
                  const isBookmarked = bookmarkedMessageIds.includes(messageId);
                  return (
                  <motion.div
                    key={messageId}
                    initial={shouldAnimate ? { opacity: 0, y: 14 } : undefined}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                    exit={shouldAnimate ? { opacity: 0, y: -6 } : undefined}
                    transition={shouldAnimate ? { duration: 0.2 } : undefined}
                    className={`flex items-start gap-3 ${msg.role === 'assistant' ? 'justify-end' : ''}`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${msg.role === 'assistant' ? 'bg-gradient-to-br from-[#0A2947] to-[#8B5E3C] text-white shadow-lg shadow-[#0A2947]/15' : 'bg-[#F3E4C9] text-[#12375A] dark:bg-slate-800 dark:text-slate-200'}`}>
                      {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                    </div>
                    <div className={`w-full max-w-[78%] rounded-[22px] border px-4 py-3 shadow-sm ${msg.role === 'assistant' ? 'border-[#D3D4C0]/70 bg-gradient-to-br from-[#F3E4C9]/80 to-white text-[#12375A] dark:border-slate-700/70 dark:text-slate-200' : 'border-[#D3D4C0]/70 bg-[#F3E4C9]/60 text-[#12375A] dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {msg.role === 'assistant' ? 'SiteLens AI' : 'You'}
                        </p>
                        <span className="text-[11px] text-slate-400">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {typeof msg.content === 'string' ? renderMarkdownContent(msg.content) : msg.content}
                      </div>
                      {msg.role === 'assistant' && (msg.sources || msg.similarity !== null) ? (
                        <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                          {msg.sources ? (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Sources</p>
                              <div className="mt-2 space-y-1">
                                {Array.isArray(msg.sources) ? msg.sources.map((source, sourceIndex) => <p key={`${source}-${sourceIndex}`} className="truncate">• {source}</p>) : <p>• {msg.sources}</p>}
                              </div>
                            </div>
                          ) : null}
                          {msg.similarity !== null && msg.similarity !== undefined ? (
                            <div className="mt-2">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Similarity</p>
                              <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">{msg.similarity}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {msg.role === 'assistant' ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => copyAnswer(msg.content, idx)} className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">
                            {copiedId === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                          </button>
                          <button type="button" onClick={() => submitQuestion(msg.question || '', { regenerate: true })} className="flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:-translate-y-0.5 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Regenerate
                          </button>
                          <button type="button" onClick={() => handleFeedback(idx, 'up')} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${feedback[idx] === 'up' ? 'border-sky-400 bg-sky-500/10 text-sky-600 dark:text-sky-300' : 'border-slate-200/70 bg-white/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300'}`}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Up
                          </button>
                          <button type="button" onClick={() => handleFeedback(idx, 'down')} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${feedback[idx] === 'down' ? 'border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'border-slate-200/70 bg-white/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300'}`}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Down
                          </button>
                          <button type="button" onClick={() => toggleBookmark(messageId)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${isBookmarked ? 'border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'border-slate-200/70 bg-white/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300'}`}>
                            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                            {isBookmarked ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>

              {isThinking ? (
                <motion.div initial={shouldAnimate ? { opacity: 0, y: 8 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A2947] to-[#8B5E3C] text-white shadow-lg shadow-[#0A2947]/15">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="max-w-[70%] rounded-[22px] border border-[#D3D4C0]/70 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-800/90">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="h-2.5 w-2.5 rounded-full bg-slate-400"
                          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.12 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[#D3D4C0]/70 bg-white/70 px-3 py-3 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/70 sm:px-4 lg:px-5">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-[999px] border border-[#D3D4C0]/70 bg-[#F3E4C9]/70 p-2 shadow-inner dark:border-slate-700/80 dark:bg-slate-800/90">
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the crawled website..."
              rows={1}
              disabled={isThinking}
              className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-[#0A2947] outline-none placeholder:text-[#12375A]/70 disabled:cursor-not-allowed dark:text-slate-200"
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={clearChat} className="rounded-full border border-[#D3D4C0]/70 bg-white/80 px-3 py-2 text-sm font-medium text-[#12375A] transition hover:-translate-y-0.5 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-300">
                Clear
              </button>
              <motion.button
                type="button"
                onClick={() => void submitQuestion(inputValue)}
                whileTap={{ scale: 0.96 }}
                disabled={isThinking || !inputValue.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#8B5E3C] via-[#D3D4C0] to-[#0A2947] text-white shadow-lg shadow-[#8B5E3C]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">Press Enter to send • Shift + Enter for a new line</p>
        </div>
      </div>
    </section>
  );
}

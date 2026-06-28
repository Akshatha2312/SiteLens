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
  Server,
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
      <p key={`p-${index}`} className="text-sm leading-7 text-[#0A2947]">
        {renderInlineContent(trimmed)}
      </p>
    );
  });

  flushBullets();
  return elements;
}

function formatSourceLabel(source) {
  if (source == null) return '';
  if (typeof source === 'string') return source;
  if (typeof source === 'object') {
    if ('chunk_id' in source || 'score' in source) {
      const chunkId = source.chunk_id ?? source.id ?? 'unknown source';
      const score = typeof source.score === 'number' ? ` (score: ${source.score.toFixed(2)})` : source.score != null ? ` (score: ${source.score})` : '';
      return `${chunkId}${score}`;
    }
    if ('text' in source) {
      return source.text;
    }
    return JSON.stringify(source);
  }
  return String(source);
}

export default function Chat({
  url,
  setUrl,
  onPipelineAction,
  loadingActions = {},
  messages,
  stats,
  isThinking,
  handleAsk,
  clearChat,
  websiteInfo,
  pipelineState,
  websiteHistory,
  recentQuestions,
  recentAnswers = [],
  onSelectWebsite,
  onSelectQuestion,
  uiError,
  clearUiError,
  bookmarkedMessageIds = [],
  toggleBookmark,
  onExportMarkdown,
  onExportPdf,
  autoScrollEnabled = true,
  animationsEnabled = true,
}) {
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
    <section className="flex min-w-0 flex-1 flex-col rounded-[24px] border border-[#D3D4C0] bg-white shadow-[0_20px_45px_-22px_rgba(10,41,71,0.16)]">
      <div className="flex flex-col">
        <div className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onExportMarkdown} className="flex items-center gap-2 rounded-full border border-[#D3D4C0] bg-[#F3E4C9] px-3 py-2 text-sm font-medium text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947]">
              <Download className="h-4 w-4" />
              Export .md
            </button>
            <button type="button" onClick={onExportPdf} className="flex items-center gap-2 rounded-full border border-[#D3D4C0] bg-[#F3E4C9] px-3 py-2 text-sm font-medium text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947]">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <div className="ml-auto rounded-full border border-[#D3D4C0] bg-white px-3 py-2 text-sm font-medium text-[#8B5E3C]">
              {bookmarkedMessageIds.length} saved insights
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {uiError ? (
              <div className="rounded-[24px] border border-[#D3D4C0]/80 bg-[#F3E4C9]/90 p-4 shadow-sm border-[#D3D4C0]/40 bg-[#F3E4C9]/40">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-[#8B5E3C]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#8B5E3C] text-[#8B5E3C]">{uiError.title}</p>
                  <p className="mt-1 text-sm text-[#8B5E3C] text-[#8B5E3C]">{uiError.explanation}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={uiError.retryAction} className="rounded-full border border-[#D3D4C0]/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-[#8B5E3C] border-[#D3D4C0]/40 bg-[#FFFFFF]/50 text-[#8B5E3C]">Try again</button>
                <button type="button" onClick={clearUiError} className="rounded-full border border-[#D3D4C0]/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-[#8B5E3C] border-[#D3D4C0] bg-[#FFFFFF]/80">Dismiss</button>
              </div>
              </div>
            ) : null}

                <div className="rounded-[26px] border border-[#D3D4C0] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#0A2947]">Website URL</p>
                <p className="text-sm text-[#8B5E3C]">Enter the site you want to crawl and then run the pipeline.</p>
              </div>
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-3 text-sm text-[#0A2947] outline-none transition focus:border-[#0A2947] focus:ring-2 focus:ring-[#0A2947]/10 bg-white"
                />
                <button
                  type="button"
                  onClick={() => onPipelineAction('crawl')}
                  disabled={loadingActions.crawl || !url}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A2947] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Server className="h-4 w-4" /> Crawl
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => onPipelineAction('process')}
                disabled={loadingActions.process}
                className="rounded-2xl border border-[#D3D4C0] bg-white px-4 py-3 text-sm font-semibold text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50 bg-[#FFFFFF]"
              >
                Process
              </button>
              <button
                type="button"
                onClick={() => onPipelineAction('embed')}
                disabled={loadingActions.embed}
                className="rounded-2xl border border-[#D3D4C0] bg-white px-4 py-3 text-sm font-semibold text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50 bg-[#FFFFFF]"
              >
                Embed
              </button>
              <button
                type="button"
                onClick={() => onPipelineAction('index')}
                disabled={loadingActions.index}
                className="rounded-2xl border border-[#D3D4C0] bg-white px-4 py-3 text-sm font-semibold text-[#0A2947] transition hover:border-[#0A2947] hover:text-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50 bg-[#FFFFFF]"
              >
                Index
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-3 text-sm text-[#8B5E3C]">
              Workflow: <span className="font-semibold text-[#0A2947]">Crawl → Process → Embed → Index</span>
            </div>
          </div>

            <div className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#8B5E3C]">Pipeline Health</p>
                  <h3 className="mt-2 text-xl font-semibold text-[#0A2947]">Live analytics workspace</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#8B5E3C]">Monitor crawl progress, indexing activity, and conversation insights in one place.</p>
                </div>
                <div className="rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] p-3">
                  <Activity className="h-5 w-5 text-[#0A2947]" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0A2947] text-[#8B5E3C]">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#0A2947]" />
                  Backend {stats.backendStatus || 'Online'}
                </div>
                <div className="rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0A2947] text-[#8B5E3C]">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#0A2947]" />
                  Workspace ready
                </div>
                <div className="rounded-2xl border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0A2947] text-[#8B5E3C]">
                  <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-[#0A2947]" />
                  FAISS ready
                </div>
              </div>
            </motion.div>

            <motion.div initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947]">Live pipeline</p>
                  <p className="text-xs text-[#8B5E3C]">Current step and completion state</p>
                </div>
                <div className="rounded-full bg-[#0A2947]/10 p-2 text-[#0A2947]">
                  <Rocket className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-[#8B5E3C]">
                  <span>{pipelineState.message}</span>
                  <span>{pipelineState.progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#D3D4C0] bg-[#FFFFFF]">
                  <motion.div animate={{ width: `${pipelineState.progress}%` }} className="h-2 rounded-full bg-[#0A2947]" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-[#8B5E3C]">
                  <Clock3 className="h-4 w-4" />
                  Elapsed {Math.round(pipelineState.elapsedMs / 1000)}s
                </div>
              </div>
            </motion.div>
          </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <motion.div key={card.label} layout initial={shouldAnimate ? { opacity: 0, y: 12 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[20px] border border-[#D3D4C0]/70 bg-white/80 p-3.5 shadow-sm transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80">
                <p className="text-sm text-[#8B5E3C]">{card.label}</p>
                <div className="mt-2 text-2xl font-semibold text-[#0A2947]">
                  <AnimatedValue value={card.value ?? '--'} />
                </div>
              </motion.div>
            ))}
          </div>

            <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947]">Pipeline timeline</p>
                  <p className="text-xs text-[#8B5E3C]">A clear view of each stage and its state</p>
                </div>
                <div className="rounded-full bg-[#0A2947]/10 p-2 text-[#0A2947]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {timelineSteps.map((step, index) => {
                  const isActive = pipelineState.currentStep === step && pipelineState.status === 'running';
                  const isComplete = pipelineState.completedSteps.includes(step);
                  return (
                    <div key={step} className={`rounded-2xl border px-3 py-3 ${isActive ? 'border-[#0A2947] bg-[#0A2947]/10 border-[#0A2947]/30 bg-[#0A2947]/10' : isComplete ? 'border-[#D3D4C0] bg-[#FFFFFF] border-[#D3D4C0] bg-[#FFFFFF]' : 'border-[#D3D4C0]/70 bg-[#FFFFFF]/80 border-[#D3D4C0] bg-[#FFFFFF]/80'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isComplete ? 'bg-[#0A2947] text-white' : isActive ? 'bg-[#0A2947] text-white' : 'bg-[#D3D4C0] text-[#8B5E3C] bg-[#FFFFFF] text-[#8B5E3C]'}`}>
                            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0A2947]">{timelineLabels[step]}</p>
                            <p className="text-xs text-[#8B5E3C]">{isActive ? 'In progress' : isComplete ? 'Completed' : 'Queued'}</p>
                          </div>
                        </div>
                        {index < timelineSteps.length - 1 ? <div className="h-px flex-1 bg-[#D3D4C0] bg-[#FFFFFF]" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947]">Website information</p>
                  <p className="text-xs text-[#8B5E3C]">Current crawl context</p>
                </div>
                <div className="rounded-full bg-[#F3E4C9]/10 p-2 text-[#0A2947]">
                  <FileSearch className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#8B5E3C]">
                <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0]">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#8B5E3C]">Current URL</p>
                  <p className="mt-1 font-medium text-[#0A2947] text-[#0A2947]">{websiteInfo.currentUrl || 'No site selected yet'}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0]">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8B5E3C]">Domain</p>
                    <p className="mt-1 font-medium text-[#0A2947] text-[#0A2947]">{websiteInfo.domain}</p>
                  </div>
                  <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0]">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8B5E3C]">Pages crawled</p>
                    <p className="mt-1 font-medium text-[#0A2947] text-[#0A2947]">{websiteInfo.pagesCrawled}</p>
                  </div>
                  <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0]">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8B5E3C]">Last crawl</p>
                    <p className="mt-1 font-medium text-[#0A2947] text-[#0A2947]">{websiteInfo.lastCrawlTime}</p>
                  </div>
                  <div className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-3 border-[#D3D4C0]">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#8B5E3C]">Index status</p>
                    <p className="mt-1 font-medium text-[#0A2947] text-[#0A2947]">{websiteInfo.indexStatus}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <motion.div initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947]">Recent websites</p>
                  <p className="text-xs text-[#8B5E3C]">Jump back into a previous crawl instantly</p>
                </div>
                <div className="rounded-full bg-[#F3E4C9]/10 p-2 text-[#8B5E3C]">
                  <DatabaseZap className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {(websiteHistory.length ? websiteHistory : [websiteInfo.currentUrl || 'https://example.com']).map((site) => (
                  <button key={site} type="button" onClick={() => onSelectWebsite(site)} className="flex w-full items-center justify-between rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 px-3 py-2.5 text-left text-sm text-[#8B5E3C] transition hover:-translate-y-0.5 border-[#D3D4C0]">
                    <span className="truncate">{site}</span>
                    <span className="text-xs text-[#8B5E3C]">Reload</span>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={shouldAnimate ? { opacity: 0, y: 10 } : undefined} animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined} className="rounded-[22px] border border-[#D3D4C0]/70 bg-white/80 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#0A2947]">Recent questions</p>
                  <p className="text-xs text-[#8B5E3C]">Reuse the last prompts you asked</p>
                </div>
                <div className="rounded-full bg-[#0A2947]/10 p-2 text-[#0A2947]">
                  <MessageCircleMore className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {recentQuestions.length ? recentQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => onSelectQuestion(question)} className="flex w-full items-center justify-between rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 px-3 py-2.5 text-left text-sm text-[#8B5E3C] transition hover:-translate-y-0.5 border-[#D3D4C0]">
                    <span className="truncate">{question}</span>
                    <span className="text-xs text-[#8B5E3C]">Reuse</span>
                  </button>
                )) : <p className="text-sm text-[#8B5E3C]">No recent prompts yet.</p>}
              </div>
              <div className="mt-4 border-t border-[#D3D4C0]/70 pt-3 border-[#D3D4C0]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B5E3C]">Recent answers</p>
                <div className="mt-2 space-y-2">
                  {recentAnswers.length ? recentAnswers.slice(0, 3).map((answer) => (
                    <div key={answer} className="rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 px-3 py-2 text-sm text-[#8B5E3C] border-[#D3D4C0]">
                      <p className="line-clamp-2">{answer}</p>
                    </div>
                  )) : <p className="text-sm text-[#8B5E3C]">No answers saved yet.</p>}
                </div>
              </div>
            </motion.div>
          </div>

            {messages.length === 0 && !isThinking ? (
            <div className="flex flex-col gap-4">
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#D3D4C0] bg-[#FFFFFF] px-3 py-1 text-sm font-medium text-[#0A2947] text-[#8B5E3C]">
                    <Sparkles className="h-4 w-4 text-[#0A2947]" />
                    Premium AI research workspace
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-semibold tracking-tight text-[#0A2947] sm:text-4xl">
                      Ask anything about your crawled website.
                    </h2>
                    <p className="max-w-2xl text-sm leading-7 text-[#8B5E3C] sm:text-base">
                      Crawl a site, turn it into context, and ask grounded questions with a polished chat experience.
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 p-4 border-[#D3D4C0]">
                    <p className="text-sm font-semibold text-[#0A2947]">Example URLs</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exampleUrls.map((url) => (
                        <span key={url} className="rounded-full border border-[#D3D4C0]/80 bg-white/80 px-3 py-1.5 text-sm text-[#8B5E3C] shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/80">
                          {url}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#D3D4C0]/70 bg-white/70 p-4 shadow-sm border-[#D3D4C0] bg-[#FFFFFF]/70">
                    <p className="text-sm font-semibold text-[#0A2947]">Example questions</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {exampleQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => setInputValue(question)}
                          className="rounded-full bg-[#0A2947] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0A2947]"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#D3D4C0] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 rounded-[22px] border border-white/70 bg-white/70 p-5 shadow-sm border-[#D3D4C0]/70 bg-[#FFFFFF]/70">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0A2947]">Live overview</p>
                        <p className="text-xs text-[#8B5E3C]">Your pipeline and insights stay in one place.</p>
                      </div>
                      <div className="rounded-full bg-[#0A2947]/10 p-2 text-[#0A2947]">
                        <MessageCircleMore className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      {[
                        { label: 'Pages Crawled', value: stats.pagesCrawled },
                        { label: 'Embeddings', value: stats.embeddings },
                        { label: 'Response Time', value: stats.responseTime },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#D3D4C0]/70 bg-[#FFFFFF]/80 px-3 py-2.5 border-[#D3D4C0]">
                          <span className="text-sm text-[#8B5E3C]">{item.label}</span>
                          <span className="text-sm font-semibold text-[#0A2947] text-[#0A2947]">{item.value ?? '--'}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-[22px] border border-dashed border-[#D3D4C0]/70 p-4 text-center text-sm text-[#8B5E3C] border-[#D3D4C0]">
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
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${msg.role === 'assistant' ? 'bg-[#0A2947] text-white shadow-sm' : 'bg-[#F3E4C9] text-[#0A2947] bg-[#FFFFFF] text-[#0A2947]'}`}>
                      {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                    </div>
                    <div className={`w-full max-w-[min(86%,640px)] rounded-[20px] border px-3.5 py-2.5 shadow-sm break-words ${msg.role === 'assistant' ? 'ml-auto border-[#D3D4C0] bg-white text-[#0A2947]' : 'mr-auto border-[#D3D4C0] bg-[#F3E4C9] text-[#0A2947]'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8B5E3C]">
                          {msg.role === 'assistant' ? 'SiteLens AI' : 'You'}
                        </p>
                        <span className="text-[11px] text-[#8B5E3C]">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {typeof msg.content === 'string' ? renderMarkdownContent(msg.content) : msg.content}
                      </div>
                      {msg.role === 'assistant' && ((Array.isArray(msg.sources) && msg.sources.length > 0) || msg.sources || msg.similarity != null) ? (
                        <div className="mt-3 rounded-2xl border border-[#D3D4C0] bg-[#F3E4C9] p-2.5 text-sm text-[#8B5E3C]">
                          {msg.sources ? (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8B5E3C]">Sources</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(Array.isArray(msg.sources) ? msg.sources : [msg.sources]).map((source, sourceIndex) => {
                                  const sourceLabel = formatSourceLabel(source);
                                  return (
                                    <span key={`${sourceLabel}-${sourceIndex}`} className="rounded-full border border-[#D3D4C0] bg-white px-2.5 py-1 text-[10px] font-medium text-[#8B5E3C]">
                                      {sourceLabel}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                          {msg.similarity != null ? (
                            <div className="mt-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8B5E3C]">Similarity</p>
                              <p className="mt-1 text-sm font-medium text-[#0A2947]">{msg.similarity}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {msg.role === 'assistant' ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button type="button" onClick={() => copyAnswer(msg.content, idx)} className="flex items-center gap-1 rounded-full border border-[#D3D4C0]/70 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-[#8B5E3C] transition hover:-translate-y-0.5 border-[#D3D4C0] bg-[#FFFFFF]/80">
                            {copiedId === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                          </button>
                          <button type="button" onClick={() => submitQuestion(msg.question || '', { regenerate: true })} className="flex items-center gap-1 rounded-full border border-[#D3D4C0]/70 bg-white/80 px-2.5 py-1.5 text-xs font-medium text-[#8B5E3C] transition hover:-translate-y-0.5 border-[#D3D4C0]/80 bg-[#FFFFFF]/80">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Regenerate
                          </button>
                          <button type="button" onClick={() => handleFeedback(idx, 'up')} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${feedback[idx] === 'up' ? 'border-[#0A2947]/50 bg-[#F3E4C9]/10 text-[#0A2947]' : 'border-[#D3D4C0]/70 bg-white/80 text-[#8B5E3C] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]'}`}>
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Up
                          </button>
                          <button type="button" onClick={() => handleFeedback(idx, 'down')} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${feedback[idx] === 'down' ? 'border-[#D3D4C0]/70 bg-[#D3D4C0]/10 text-[#8B5E3C]' : 'border-[#D3D4C0]/70 bg-white/80 text-[#8B5E3C] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]'}`}>
                            <ThumbsDown className="h-3.5 w-3.5" />
                            Down
                          </button>
                          <button type="button" onClick={() => toggleBookmark(messageId)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition hover:-translate-y-0.5 ${isBookmarked ? 'border-[#8B5E3C]/70 bg-[#F3E4C9]/10 text-[#8B5E3C]' : 'border-[#D3D4C0]/70 bg-white/80 text-[#8B5E3C] border-[#D3D4C0] bg-[#FFFFFF]/80 text-[#8B5E3C]'}`}>
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0A2947] text-white shadow-sm">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="max-w-[70%] rounded-[22px] border border-[#D3D4C0] bg-white/90 px-4 py-3 shadow-sm border-[#D3D4C0]/80 bg-[#FFFFFF]/90">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#8B5E3C]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          className="h-2.5 w-2.5 rounded-full bg-[#D3D4C0]"
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
        </div>

        <div className="border-t border-[#D3D4C0] bg-white/95 px-3 py-3 backdrop-blur-sm sm:px-4 lg:px-5">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-[999px] border border-[#D3D4C0] bg-[#F3E4C9] p-2 shadow-inner">
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about the crawled website..."
              rows={1}
              disabled={isThinking}
              className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-[#0A2947] outline-none placeholder:text-[#8B5E3C]/70 disabled:cursor-not-allowed text-[#0A2947]"
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={clearChat} className="rounded-full border border-[#D3D4C0] bg-white/80 px-3 py-2 text-sm font-medium text-[#0A2947] transition hover:-translate-y-0.5 bg-[#FFFFFF]/80 text-[#8B5E3C]">
                Clear
              </button>
              <motion.button
                type="button"
                onClick={() => void submitQuestion(inputValue)}
                whileTap={{ scale: 0.96 }}
                disabled={isThinking || !inputValue.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0A2947] text-white shadow-sm transition hover:bg-[#0A2947] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#8B5E3C]">Press Enter to send • Shift + Enter for a new line</p>
        </div>
      </div>
    </section>
  );
}

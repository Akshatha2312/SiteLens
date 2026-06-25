import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiSearch, FiMessageSquare, FiPlay, FiUpload, FiServer, FiDatabase } from 'react-icons/fi';

/**
 * Sidebar component containing the pipeline controls.
 * Props:
 *   - url: current URL string
 *   - setUrl: setter for URL
 *   - addMessage: function(role, content) to push chat messages
 */
export default function Sidebar({ url, setUrl, addMessage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [askPrompt, setAskPrompt] = useState('');
  const [loading, setLoading] = useState({}); // {action: boolean}

  const handleAction = async (action) => {
    try {
      setLoading((prev) => ({ ...prev, [action]: true }));
      let response;
      switch (action) {
        case 'crawl':
          response = await api.post('/crawl', { url });
          toast.success('Crawl completed');
          break;
        case 'process':
          response = await api.post('/process');
          toast.success('Process completed');
          break;
        case 'embed':
          response = await api.post('/embed');
          toast.success('Embed completed');
          break;
        case 'index':
          response = await api.post('/index');
          toast.success('Index completed');
          break;
        case 'search':
          response = await api.post('/search', { query: searchQuery });
          toast.success('Search completed');
          addMessage('assistant', `Search results: ${JSON.stringify(response.data)}`);
          break;
        case 'ask':
          response = await api.post('/ask', { question: askPrompt });
          toast.success('Answer received');
          addMessage('assistant', response.data.answer || JSON.stringify(response.data));
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error during ${action}: ${err.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  const buttonClass = (action) =>
    `flex items-center w-full px-4 py-2 mt-2 text-sm font-medium rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      loading[action] ? 'cursor-wait' : ''
    }`;

  return (
    <aside className="w-80 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto flex flex-col">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="url-input">
          Site URL
        </label>
        <input
          id="url-input"
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 focus:outline-none"
        />
        <button
          onClick={() => handleAction('crawl')}
          disabled={loading.crawl || !url}
          className={buttonClass('crawl')}
        >
          <FiServer className="mr-2" /> Crawl
        </button>
      </div>

      <div className="mb-4">
        <button onClick={() => handleAction('process')} disabled={loading.process} className={buttonClass('process')}>
          <FiPlay className="mr-2" /> Process
        </button>
        <button onClick={() => handleAction('embed')} disabled={loading.embed} className={buttonClass('embed')}>
          <FiUpload className="mr-2" /> Embed
        </button>
        <button onClick={() => handleAction('index')} disabled={loading.index} className={buttonClass('index')}>
          <FiDatabase className="mr-2" /> Index
        </button>
      </div>

      <div className="mb-4 border-t pt-4">
        <label className="block text-sm font-medium mb-1" htmlFor="search-input">
          Search
        </label>
        <input
          id="search-input"
          type="text"
          placeholder="Search term"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 focus:outline-none"
        />
        <button
          onClick={() => handleAction('search')}
          disabled={loading.search || !searchQuery}
          className={buttonClass('search')}
        >
          <FiSearch className="mr-2" /> Search
        </button>
      </div>

      <div className="flex-1 border-t pt-4">
        <label className="block text-sm font-medium mb-1" htmlFor="ask-input">
          Ask (RAG Chat)
        </label>
        <textarea
          id="ask-input"
          rows={3}
          placeholder="Ask a question..."
          value={askPrompt}
          onChange={(e) => setAskPrompt(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-700 focus:outline-none"
        />
        <button
          onClick={() => handleAction('ask')}
          disabled={loading.ask || !askPrompt}
          className={buttonClass('ask')}
        >
          <FiMessageSquare className="mr-2" /> Ask
        </button>
      </div>
    </aside>
  );
}

import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState([]);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar url={url} setUrl={setUrl} addMessage={addMessage} />
        <Chat messages={messages} addMessage={addMessage} />
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

import React, { useEffect, useRef } from 'react';
import { FiUser, FiMessageSquare } from 'react-icons/fi';
import { MdSmartToy } from 'react-icons/md';


/**
 * Chat component displays conversation messages.
 * Props:
 *   - messages: array of {role, content}
 *   - addMessage: function to add new messages (unused here but passed for future extensions)
 */
export default function Chat({ messages }) {
  const bottomRef = useRef(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <section className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
      {messages.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Use the sidebar to start a workflow.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((msg, idx) => (
            <li
              key={idx}
              className={`flex items-start space-x-2 ${msg.role === 'assistant' ? 'flex-row-reverse' : ''}`}
            >
              <div className="flex-shrink-0">
                {msg.role === 'assistant' ? (
                  <MdSmartToy className="text-2xl text-blue-500" />
                ) : (
                  <FiUser className="text-2xl text-green-500" />
                )}
              </div>
              <div
                className={`rounded-lg p-2 max-w-xs break-words ${msg.role === 'assistant' ? 'bg-blue-50 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {msg.content}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div ref={bottomRef} />
    </section>
  );
}

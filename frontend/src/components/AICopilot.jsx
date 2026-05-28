import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

const AICopilot = ({ isOpen, onClose, activeIntent }) => {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Hi! I am your AI Goal Co-pilot. ✨ Tell me what you want to achieve or ask me to refine your schedules, break down tasks, or suggest resources!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    "Suggest resources for this intent",
    "Give me tips to beat procrastination",
    "Adjust this plan for a busier schedule",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (activeIntent) {
      setMessages([
        {
          role: 'model',
          text: `Hi! I see you are working on **"${activeIntent.title}"**. 🎯 How can I help you optimize your milestones, adjust for constraints, or explain any tasks?`
        }
      ]);
    }
  }, [activeIntent]);

  const handleSendMessage = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || loading) return;

    if (!textToSend) setInput('');

    // Append user message
    const userMsg = { role: 'user', text: prompt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Exclude greeting message from history to save token limits
      const chatHistory = messages
        .filter((_, idx) => idx > 0)
        .map(msg => ({ role: msg.role, text: msg.text }));

      // Append intent context if any
      const fullPrompt = activeIntent 
        ? `[Parent Goal: ${activeIntent.title} - ${activeIntent.description || ''}]\n\n${prompt}`
        : prompt;

      const response = await api.post('ai/copilot/', {
        prompt: fullPrompt,
        history: chatHistory
      });

      setMessages(prev => [...prev, { role: 'model', text: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'model', 
          text: "⚠️ Sorry, I encountered an issue. Please verify that your `GEMINI_API_KEY` is fully configured." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-2xl border-l border-gray-100 dark:border-gray-800 z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-indigo-600 text-white rounded-tl-xl">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-bold text-sm">AI Goal Co-pilot</h3>
            <p className="text-[10px] text-indigo-200">Gemini-Powered Workspace Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-indigo-700/50 p-1.5 rounded-lg transition"
        >
          ✕
        </button>
      </div>

      {/* active Intent Banner */}
      {activeIntent && (
        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center gap-2">
          <span className="text-xs">🎯</span>
          <span className="text-xs font-semibold text-indigo-800 truncate">
            Context: {activeIntent.title}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex items-center gap-2 border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-xs font-medium text-indigo-600">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 1 && !loading && (
        <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-2.5 py-1.5 rounded-full transition text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-150 dark:border-gray-800 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm transition"
            placeholder="Ask AI anything..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium p-2 rounded-xl transition disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AICopilot;

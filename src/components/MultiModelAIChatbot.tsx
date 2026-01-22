'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MODELS, classifyQuestion } from '../../ai-engine/models';
import { useChat } from '@/context/ChatContext';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  modelUsed?: string;
}

// Simple formatter for AI responses
function formatAIResponse(content: string): React.ReactNode {
  if (!content) return content;
  
  // Split by double newlines to get paragraphs
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  return (
    <>
      {paragraphs.map((para, index) => {
        const trimmed = para.trim();
        
        // Handle lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
          const items = trimmed.split('\n').filter(item => item.trim());
          const isNumbered = items[0]?.match(/^\d+\.\s/);
          
          return (
            <ul key={index} className={`list-inside mb-2 ${isNumbered ? 'list-decimal' : 'list-disc'}`}>
              {items.map((item, i) => (
                <li key={i} className="ml-2 mb-1">
                  {item.replace(/^[-*]\s|^\d+\.\s/, '')}
                </li>
              ))}
            </ul>
          );
        }
        
        // Handle headers
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={index} className="font-semibold text-gray-900 mb-2 mt-3">
              {trimmed.substring(2)}
            </h3>
          );
        }
        
        // Handle bold text
        if (trimmed.includes('**')) {
          const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={index} className="mb-2 text-gray-700">
              {parts.map((part, i) => 
                part.startsWith('**') && part.endsWith('**') ? 
                  <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : 
                  part
              )}
            </p>
          );
        }
        
        // Regular paragraph
        return (
          <p key={index} className="mb-2 text-gray-700 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </>
  );
}

export default function MultiModelAIChatbot({ blogContent, startFullscreen = false }: { blogContent?: string; startFullscreen?: boolean }) {
  const { isFullscreenChatOpen, closeFullscreenChat } = useChat();
  const [isOpen, setIsOpen] = useState(startFullscreen || isFullscreenChatOpen);
  const [isFullscreen, setIsFullscreen] = useState(startFullscreen || isFullscreenChatOpen);
  const [isInitialized, setIsInitialized] = useState(false);

  // Remove debug logging for performance
  useEffect(() => {
    if (startFullscreen || isFullscreenChatOpen) {
      setIsInitialized(true);
    }
  }, [startFullscreen, isFullscreenChatOpen]);

  // Sync with context when it changes
  useEffect(() => {
    if (isFullscreenChatOpen) {
      setIsOpen(true);
      setIsFullscreen(true);
      setIsInitialized(true);
    }
  }, [isFullscreenChatOpen]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('quick'); // Default to quick model
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Initialize messages after component mounts to improve initial render performance
  useEffect(() => {
    setMessages([
      {
        id: '1',
        content: blogContent 
          ? "Hello! I'm your medical science and physiotherapy assistant. I can answer questions about this blog post or provide general information about physiotherapy topics." 
          : "Hello! I'm your medical science and physiotherapy assistant. Ask me anything about physiotherapy, rehabilitation, or related topics!",
        role: 'assistant',
        timestamp: new Date(),
      }
    ]);
  }, [blogContent]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Auto-select model based on the question
    const modelToUse = classifyQuestion(inputValue);
    setSelectedModel(modelToUse);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare messages for API (only send last few messages to avoid token limits)
      const recentMessages = [...messages, userMessage].slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let response;
      if (blogContent) {
        // If blog content is provided, use the blog-specific endpoint
        response = await fetch('/api/ai/blog-questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: inputValue,
            blogContent: blogContent,
            model: MODELS[modelToUse].name
          }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get response');
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          role: 'assistant',
          timestamp: new Date(),
          modelUsed: MODELS[modelToUse].displayName
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Otherwise use the general chat endpoint
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: recentMessages,
            model: MODELS[modelToUse].name
          }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to get response');
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.data,
          role: 'assistant',
          timestamp: new Date(),
          modelUsed: MODELS[modelToUse].displayName
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please check that your API key is configured correctly.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, blogContent]);

  return (
    <div className={`fixed z-50 ${isFullscreen ? 'top-0 left-64 right-0 bottom-0' : 'bottom-6 right-6'}`}>
      {isOpen ? (
        <div className={`bg-white flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'w-96 h-[500px] rounded-lg shadow-xl border border-gray-200'}`}>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-3 flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              <h3 className={`font-semibold ${isFullscreen ? 'text-lg' : ''}`}>
                {isFullscreen ? 'Medical AI Assistant - Sidebar Mode' : 'Medical AI Assistant'}
              </h3>
            </div>
            <div className="flex space-x-2">
              {!isFullscreen && (
                <Link href="/ai-chat" className="text-white hover:text-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </Link>
              )}
              <button 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="text-white hover:text-gray-200 p-1 rounded hover:bg-white/10 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                  if (isFullscreenChatOpen) {
                    closeFullscreenChat();
                  }
                }}
                className="text-white hover:text-gray-200 p-1 rounded hover:bg-white/10 transition-colors"
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Model Info Display - Auto-selected model shown with each message */}
          {selectedModel && (
            <div className={`p-2 bg-gray-50 border-b border-gray-200 ${isFullscreen ? 'sticky top-0' : ''}`}>
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">Auto-selected model: </span>
                <span className={`text-xs font-bold px-2 py-1 rounded ml-2 ${MODELS[selectedModel].color} text-white`}>
                  {MODELS[selectedModel].displayName}
                </span>
              </div>
            </div>
          )}
          
          <div className={`flex-1 overflow-y-auto p-3 bg-gray-50 ${isFullscreen ? 'px-8 py-6' : ''}`}>
            {isInitialized && messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div className="flex items-start gap-3">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`inline-block rounded-lg max-w-[85%] ${isFullscreen ? 'p-4 text-base' : 'p-2 text-sm'} ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-none shadow-md'
                        : 'bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {formatAIResponse(message.content)}
                    </div>
                    {message.modelUsed && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Model used:</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${MODELS[Object.keys(MODELS).find(key => MODELS[key].displayName === message.modelUsed) || 'quick'].color} text-white`}>
                            {message.modelUsed}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2 ml-11" suppressHydrationWarning>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {!isInitialized && (
              <div className="flex flex-col items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 text-sm">Loading AI assistant...</p>
              </div>
            )}
            {isLoading && (
              <div className="mb-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="inline-block p-4 rounded-lg bg-white text-gray-800 rounded-bl-none border border-gray-200 shadow-sm">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className={`border-t border-gray-200 bg-white ${isFullscreen ? 'p-6 sticky bottom-0' : 'p-2'}`}>
            <div className="flex max-w-4xl mx-auto">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about physiotherapy (auto-selects model)..."
                className={`flex-1 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isFullscreen ? 'px-4 py-3 text-base rounded-l-xl' : 'px-3 py-2 text-sm rounded-l-lg'}`}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isFullscreen ? 'px-6 py-3 rounded-r-xl text-base' : 'px-4 py-2 rounded-r-lg text-sm'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={isFullscreen ? 'h-5 w-5' : 'h-4 w-4'} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsInitialized(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all transform hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </div>
  );
}
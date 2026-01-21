'use client';

import { useState, useRef, useEffect } from 'react';
import { MODELS, classifyQuestion } from '../../ai-engine/models';

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

export default function AIChatExpanded({ blogContent }: { blogContent?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: blogContent 
        ? "Hello! I'm your medical science and physiotherapy assistant. I can answer questions about this blog post or provide general information about physiotherapy topics." 
        : "Hello! I'm your medical science and physiotherapy assistant. Ask me anything about physiotherapy, rehabilitation, or related topics!",
      role: 'assistant',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('quick'); // Default to quick model
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-[600px] max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-t-lg">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
          <h3 className="font-semibold text-lg">Medical AI Assistant</h3>
        </div>
      </div>
      
      {/* Auto-selected Model Info */}
      {selectedModel && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">Auto-selected model: </span>
            <span className={`text-sm font-bold px-3 py-1 rounded ml-2 ${MODELS[selectedModel].color} text-white`}>
              {MODELS[selectedModel].displayName}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div
                  className={`inline-block p-3 rounded-lg max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {formatAIResponse(message.content)}
                  </div>
                  {message.modelUsed && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
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
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 ml-10" suppressHydrationWarning>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-4 text-left">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.036-.687-.101-1.016A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="inline-block p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
        <div className="max-w-3xl mx-auto flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about physiotherapy, rehabilitation, or medical science (auto-selects model)..."
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-r-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
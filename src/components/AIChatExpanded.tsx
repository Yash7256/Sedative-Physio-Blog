'use client';

import { useState, useRef, useEffect } from 'react';
import { MODELS, classifyQuestion } from '../../ai-engine/models';
import { useAuth } from '@/components/SupabaseProvider';
import { getUserName } from '@/lib/authUtils';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  modelUsed?: string;
}

function formatAIResponse(content: string): React.ReactNode {
  if (!content) return content;
  
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  return (
    <>
      {paragraphs.map((para, index) => {
        const trimmed = para.trim();
        
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
          const items = trimmed.split('\n').filter(item => item.trim());
          const isNumbered = items[0]?.match(/^\d+\.\s/);
          
          return (
            <ul key={index} className={`list-inside mb-2 space-y-1 ${isNumbered ? 'list-decimal' : 'list-disc'}`}>
              {items.map((item, i) => (
                <li key={i} className="ml-2 text-gray-700">
                  {item.replace(/^[-*]\s|^\d+\.\s/, '')}
                </li>
              ))}
            </ul>
          );
        }
        
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={index} className="font-bold text-gray-900 mb-2 mt-3 text-lg">
              {trimmed.substring(2)}
            </h3>
          );
        }
        
        if (trimmed.includes('**')) {
          const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={index} className="mb-2 text-gray-700">
              {parts.map((part, i) => 
                part.startsWith('**') && part.endsWith('**') ? 
                  <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong> : 
                  part
              )}
            </p>
          );
        }
        
        return (
          <p key={index} className="mb-2 text-gray-700 leading-relaxed">
            {trimmed}
          </p>
        );
      })}
    </>
  );
}

const SUGGESTED_QUESTIONS = [
  'What exercises help with lower back pain?',
  'How to recover from shoulder injury?',
  'Best practices for post-surgical rehab?',
  'Tips for improving posture',
];

export default function AIChatExpanded({ blogContent }: { blogContent?: string }) {
  const { session } = useAuth();
  const userName = session ? getUserName(session) : '';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('quick');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [tokenUsage, setTokenUsage] = useState<{
    tokensUsed: number;
    tokensRemaining: number;
    hasPaid: boolean;
    limitInfo?: { freeLimit: number; windowHours: number };
  } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isInitialized) {
      const greeting = blogContent 
        ? `Hey ${userName ? userName.split(' ')[0] : ''}! 👋 I'm your physiotherapy assistant. Ask me anything about this blog or general PT topics!`
        : `Hey ${userName ? userName.split(' ')[0] : ''}! 👋 I'm here to help with your physiotherapy questions. What would you like to know?`;
      
      setMessages([{
        id: '1',
        content: greeting,
        role: 'assistant',
        timestamp: new Date(),
      }]);
      setIsInitialized(true);
    }
  }, [isInitialized, userName, blogContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const modelToUse = classifyQuestion(inputValue);
    setSelectedModel(modelToUse);

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
      const recentMessages = [...messages, userMessage].slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let response;
      if (blogContent) {
        response = await fetch('/api/ai/blog-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: inputValue,
            blogContent: blogContent,
            model: MODELS[modelToUse].name
          }),
        });
        
        const data = await response.json();
        
        if (response.status === 429) {
          const limitMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `⚠️ **Word Limit Reached!**\n\nYou've used all your ${data.limitInfo?.freeLimit ? Math.round(data.limitInfo.freeLimit * 0.75).toLocaleString() : '11,250'} free words.\n\nYour limit will reset in ${data.limitInfo?.windowHours || 4} hours.\n\n💡 Upgrade to a paid course for UNLIMITED access!`,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, limitMessage]);
          if (data.tokenInfo) {
            setTokenUsage({
              tokensUsed: data.tokensUsed,
              tokensRemaining: data.tokensRemaining,
              hasPaid: data.hasPaid,
              limitInfo: data.limitInfo
            });
          }
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) throw new Error(data.error || 'Failed to get response');
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: data.answer,
          role: 'assistant',
          timestamp: new Date(),
          modelUsed: MODELS[modelToUse].displayName
        }]);
        
        if (data.tokenInfo) {
          setTokenUsage({
            tokensUsed: data.tokenInfo.tokensUsed,
            tokensRemaining: data.tokenInfo.tokensRemaining,
            hasPaid: data.tokenInfo.hasPaid,
            limitInfo: data.tokenInfo.limitInfo
          });
        }
      } else {
        response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: recentMessages,
            model: MODELS[modelToUse].name
          }),
        });
        
        const data = await response.json();
        
        if (response.status === 429) {
          const limitMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: `⚠️ **Word Limit Reached!**\n\nYou've used all your ${data.limitInfo?.freeLimit ? Math.round(data.limitInfo.freeLimit * 0.75).toLocaleString() : '11,250'} free words.\n\nYour limit will reset in ${data.limitInfo?.windowHours || 4} hours.\n\n💡 Upgrade to a paid course for UNLIMITED access!`,
            role: 'assistant',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, limitMessage]);
          if (data.tokenInfo) {
            setTokenUsage({
              tokensUsed: data.tokensUsed,
              tokensRemaining: data.tokensRemaining,
              hasPaid: data.hasPaid,
              limitInfo: data.limitInfo
            });
          }
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) throw new Error(data.error || 'Failed to get response');
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: data.data,
          role: 'assistant',
          timestamp: new Date(),
          modelUsed: MODELS[modelToUse].displayName
        }]);
        
        if (data.tokenInfo) {
          setTokenUsage({
            tokensUsed: data.tokenInfo.tokensUsed,
            tokensRemaining: data.tokenInfo.tokensRemaining,
            hasPaid: data.tokenInfo.hasPaid,
            limitInfo: data.tokenInfo.limitInfo
          });
        }
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Oops! Something went wrong. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const getUsagePercentage = () => {
    if (!tokenUsage || !tokenUsage.limitInfo) return 0;
    return Math.min(100, (tokenUsage.tokensUsed / tokenUsage.limitInfo.freeLimit) * 100);
  };

  const getUsageColor = () => {
    const pct = getUsagePercentage();
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-orange-500';
    if (pct >= 50) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F4F8]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* Message Bubble */}
              <div className={`max-w-2xl ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                }`}>
                  <div className="prose prose-sm max-w-none">
                    {formatAIResponse(message.content)}
                  </div>
                </div>
                <div className={`flex items-center gap-2 mt-1.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.modelUsed && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${MODELS[Object.keys(MODELS).find(key => MODELS[key].displayName === message.modelUsed) || 'quick'].color} text-white`}>
                      {message.modelUsed}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-[#6C63FF] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions - Centered Welcome State */}
          {messages.length <= 1 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h3>
                <p className="text-sm text-gray-500">Ask me anything about physiotherapy, exercises, or rehabilitation.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {SUGGESTED_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="px-4 py-2.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:bg-[#6C63FF]/5 hover:border-[#6C63FF] hover:text-[#6C63FF] transition shadow-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Sticky Bottom */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything about physiotherapy..."
              className="w-full pl-4 pr-14 py-3.5 rounded-2xl border border-gray-300 focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 outline-none transition bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-[#6C63FF] text-white flex items-center justify-center hover:bg-[#5B52EE] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI responses are for informational purposes only. Always consult a healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}

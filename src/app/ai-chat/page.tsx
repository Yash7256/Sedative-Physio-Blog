'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AIChatExpanded from '@/components/AIChatExpanded';

export default function AIChatPage() {
  return (
    <div className="h-[calc(100vh-73px)] flex flex-col bg-[#F4F4F8]">
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Token Usage */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-xs text-gray-600 font-medium">
                3,500 used
              </span>
              <span className="text-xs text-gray-400 mx-1">|</span>
              <span className="text-xs text-gray-600 font-medium">
                11,500 left
              </span>
            </div>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#6C63FF] rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>

          {/* Model Selector Dropdown */}
          <ModelSelector />
        </header>

        {/* Chat Component */}
        <div className="flex-1 overflow-hidden">
          <AIChatExpanded />
        </div>
      </main>
    </div>
  );
}

function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('quick');

  const models = [
    { id: 'quick', name: 'Quick Response', desc: 'Fast answers' },
    { id: 'detailed', name: 'Detailed Response', desc: 'In-depth explanations' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm font-medium text-gray-700"
      >
        {models.find(m => m.id === selectedModel)?.name}
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Mode</p>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  setSelectedModel(model.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition ${
                  selectedModel === model.id ? 'bg-[#6C63FF]/5' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{model.name}</p>
                <p className="text-xs text-gray-500">{model.desc}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

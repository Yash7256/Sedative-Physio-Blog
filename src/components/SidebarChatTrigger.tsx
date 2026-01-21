"use client";

import { useState } from "react";
import MultiModelAIChatbot from "./MultiModelAIChatbot";
import { IconRobot } from "@tabler/icons-react";

export default function SidebarChatTrigger() {
  const [showFullscreenChat, setShowFullscreenChat] = useState(false);

  if (showFullscreenChat) {
    return (
      <div className="fixed inset-0 z-50">
        <MultiModelAIChatbot startFullscreen={true} />
        <button
          onClick={() => setShowFullscreenChat(false)}
          className="fixed top-4 right-4 z-50 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
          aria-label="Close fullscreen chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowFullscreenChat(true)}
      className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all transform hover:scale-105 lg:right-[calc(1rem+16rem)]"
      aria-label="Open AI Assistant Fullscreen"
    >
      <IconRobot className="h-6 w-6" />
    </button>
  );
}
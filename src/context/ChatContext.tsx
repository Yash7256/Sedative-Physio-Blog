"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ChatContextType {
  isFullscreenChatOpen: boolean;
  openFullscreenChat: () => void;
  closeFullscreenChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isFullscreenChatOpen, setIsFullscreenChatOpen] = useState(false);

  const openFullscreenChat = () => {
    console.log('Opening fullscreen chat from context');
    setIsFullscreenChatOpen(true);
  };

  const closeFullscreenChat = () => {
    console.log('Closing fullscreen chat from context');
    setIsFullscreenChatOpen(false);
  };

  // Debug logging
  useEffect(() => {
    console.log('ChatContext state changed:', { isFullscreenChatOpen });
  }, [isFullscreenChatOpen]);

  return (
    <ChatContext.Provider value={{ 
      isFullscreenChatOpen, 
      openFullscreenChat, 
      closeFullscreenChat 
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
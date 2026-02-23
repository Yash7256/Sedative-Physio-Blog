"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-black text-white py-3 px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-center gap-2 md:gap-4 relative">
        <span className="text-xs md:text-sm text-center flex-grow">
          🩺 New Batch Starting — Sports Physiotherapy Masterclass | Enroll Now →
        </span>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 p-1 hover:opacity-70 transition-opacity"
          aria-label="Dismiss announcement"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

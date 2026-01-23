"use client";

import { useState, useEffect } from "react";
import Spline from '@splinetool/react-spline';

interface SplineLoaderProps {
  onLoadComplete: () => void;
  scene: string;
}

export default function SplineLoader({ onLoadComplete, scene }: SplineLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const handleLoad = () => {
    setIsLoading(false);
    // Small delay to ensure smooth transition
    setTimeout(() => {
      onLoadComplete();
    }, 500);
  };

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  if (!isLoading) {
    return (
      <div className="w-full h-full">
        <Spline scene={scene} onLoad={handleLoad} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black rounded-xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-white text-xl font-semibold mb-2">Loading Experience</h3>
        <p className="text-gray-400">Preparing your immersive visualization...</p>
      </div>
      
      <div className="w-64 bg-gray-800 rounded-full h-2.5">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-4 text-gray-400 text-sm">
        {Math.round(progress)}% loaded
      </div>
    </div>
  );
}
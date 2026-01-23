"use client";

import { useState } from "react";
import SplineLoader from "./SplineLoader";

interface LoadingWrapperProps {
  children: React.ReactNode;
}

export default function LoadingWrapper({ children }: LoadingWrapperProps) {
  const [splineLoaded, setSplineLoaded] = useState(false);

  const handleSplineLoad = () => {
    setSplineLoaded(true);
  };

  if (!splineLoaded) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="max-w-2xl w-full px-8 text-center">
          {/* Brand Header */}
          <div className="mb-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🏥</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              MedScience Physio
            </h1>
            <p className="text-gray-400">
              Evidence-based research and clinical insights
            </p>
          </div>

          {/* Spline Loader */}
          <div className="bg-black rounded-2xl p-6 border border-gray-800 shadow-2xl mb-8">
            <div className="h-80">
              <SplineLoader 
                onLoadComplete={handleSplineLoad} 
                scene="/spline/pill.spline" 
              />
            </div>
          </div>

          {/* Loading Message */}
          <div className="text-gray-400">
            <p className="mb-2">Initializing medical visualization engine...</p>
            <p className="text-sm">Please wait while we prepare your experience</p>
          </div>

          {/* Progress Indicator */}
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
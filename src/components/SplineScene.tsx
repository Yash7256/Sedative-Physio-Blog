'use client';

import { useState, useEffect } from 'react';

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export default function SplineScene({ scene, className }: SplineSceneProps) {
  const [SplineComponent, setSplineComponent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Only import on client side
    if (typeof window !== 'undefined') {
      import('@splinetool/react-spline')
        .then((module) => {
          setSplineComponent(() => module.default);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load Spline component:', err);
          setError(true);
          setLoading(false);
        });
    }
  }, []);

  if (error) {
    return <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${className}`}>3D Model unavailable</div>;
  }

  if (loading || !SplineComponent) {
    return <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${className}`}>Loading 3D Model...</div>;
  }

  return <SplineComponent scene={scene} className={className} />;
}
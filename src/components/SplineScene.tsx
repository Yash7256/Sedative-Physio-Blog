'use client';

import { useState, useEffect } from 'react';

interface SplineSceneProps {
  scene?: string;
  className?: string;
}

export default function SplineScene({ scene, className }: SplineSceneProps) {
  const [isClient, setIsClient] = useState(false);
  const [ThreeDViewer, setThreeDViewer] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import the 3D viewer only on the client
    import('./ThreeDViewer').then((module) => {
      setThreeDViewer(() => module.default);
    }).catch(() => {
      // If 3D viewer fails to load, just show the placeholder
      console.warn('Failed to load 3D viewer');
    });
  }, []);

  if (!isClient || !ThreeDViewer) {
    return (
      <div className={`w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 ${className}`}>
        <div className="text-center">
          <div className="bg-white rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading 3D Visualization</h3>
          <p className="text-gray-600 text-sm">Preparing medical model...</p>
        </div>
      </div>
    );
  }

  return <ThreeDViewer className={className} />;
}

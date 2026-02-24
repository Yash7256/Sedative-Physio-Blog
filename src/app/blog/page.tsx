"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function Blog() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <img
            src="/images/logo.png"
            alt="Sedative Physio"
            className="h-16 w-auto mx-auto mb-8"
          />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Coming Soon
        </h1>
        <p className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4">
          Blog & Articles
        </p>
        <p className="text-lg text-gray-300 mb-8">
          Insights, tips, and expert articles on physiotherapy, clinical practice, and professional development for BPT students.
        </p>
        <div className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white font-medium hover:shadow-lg transition-shadow">
          Coming Soon
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
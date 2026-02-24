"use client";

import Link from "next/link";
import { Icon3dCubeSphere, IconArrowRight } from "@tabler/icons-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ResourcesPage() {
  const resources = [
    {
      id: "3d-models",
      title: "3D Anatomy Models",
      description: "Interactive 3D anatomical models for learning and clinical reference",
      icon: Icon3dCubeSphere,
      href: "/models",
      color: "from-blue-500 to-cyan-500",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Learning Resources
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Access our comprehensive collection of educational tools and materials designed for physiotherapy students and professionals.
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Link
                key={resource.id}
                href={resource.href}
                className="group"
              >
                <div className="h-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-300 shadow-sm hover:shadow-lg">
                  {/* Card Header with Gradient */}
                  <div className={`bg-gradient-to-r ${resource.color} p-8 flex items-center justify-center`}>
                    <Icon size={64} className="text-white" />
                  </div>

                  {/* Card Content */}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {resource.title}
                    </h2>
                    <p className="text-gray-600 text-sm mb-6">
                      {resource.description}
                    </p>
                    
                    {/* CTA Button */}
                    <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                      Explore
                      <IconArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 p-8 md:p-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h3>
          <p className="text-gray-700 mb-6">
            We're continuously expanding our resource library. More tools and materials will be added soon to support your learning journey.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
              📚 Study Guides
            </div>
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
              📋 Clinical Protocols
            </div>
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
              🎬 Video Tutorials
            </div>
            <div className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-600">
              📊 Research Papers
            </div>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

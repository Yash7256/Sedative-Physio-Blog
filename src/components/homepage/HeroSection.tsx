"use client";

import { useEffect, useState } from "react";

interface Stat {
  number: string;
  label: string;
}

export function HeroSection() {
  return (
    <section className="w-full bg-white pt-12 md:pt-24 pb-16 md:pb-24 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-6 md:mb-8">
          <span className="inline-block bg-black text-white px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-medium">
            Physiotherapy Learning Platform
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black text-center leading-tight mb-6 md:mb-8">
          Master Physiotherapy.
          <br />
          Learn from Real Clinicians.
        </h1>

        {/* Sub-headline */}
        <p className="text-base md:text-lg text-gray-700 text-center max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed">
          Expert-led courses in Clinical Skills, Anatomy, Sports, Neuro & Cardio
          — built exclusively for BPT students.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-12 md:mb-16">
          <button className="w-full sm:w-auto px-8 py-3 border-2 border-black text-black font-medium rounded-full hover:bg-black hover:text-white transition-colors">
            Explore Courses
          </button>
          <button className="w-full sm:w-auto px-8 py-3 bg-black text-white font-medium rounded-full hover:bg-gray-900 transition-colors">
            Get Started Free
          </button>
        </div>

        {/* Social Proof */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center md:text-left mb-12 md:mb-16">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-600"
              >
                {i}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm md:text-base font-medium text-black">
              Trusted by 600+ BPT students
            </p>
            <p className="text-xs md:text-sm text-gray-600">⭐ 4.8/5 average rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}

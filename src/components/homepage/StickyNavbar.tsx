"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function StickyNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const navLinks = [
    "About",
    "Courses",
    "Live Classes",
    "Specializations",
    "Certifications",
    "Blog",
    "Resources",
  ];

  if (typeof window !== "undefined") {
    window.addEventListener(
      "scroll",
      () => {
        setHasScrolled(window.scrollY > 0);
      },
      { passive: true }
    );
  }

  return (
    <>
      <nav
        className={`sticky top-12 md:top-0 w-full bg-white z-40 transition-shadow duration-200 ${
          hasScrolled ? "shadow-md border-b border-gray-200" : "border-b border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="font-bold text-lg md:text-xl text-black font-['system-ui']">
            Sedative Physio
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-sm text-black hover:opacity-70 transition-opacity font-medium"
              >
                {link}
              </a>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <a href="#" className="text-sm text-black hover:opacity-70">
              Login
            </a>
            <button className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-900 transition-colors">
              Start Learning
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X size={24} className="text-black" />
            ) : (
              <Menu size={24} className="text-black" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-gray-200 py-4 px-4">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase().replace(" ", "-")}`}
                  className="text-black font-medium py-2 hover:opacity-70"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link}
                </a>
              ))}
              <div className="border-t border-gray-200 pt-4 flex flex-col gap-3">
                <a href="#" className="text-black font-medium py-2">
                  Login
                </a>
                <button className="w-full px-4 py-2.5 bg-black text-white rounded-full font-medium">
                  Start Learning
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

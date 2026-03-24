"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import LoginButton from "@/components/LoginButton";

export function StickyNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "About", href: "/about" },
    { label: "Courses", href: "/courses" },
    { label: "Blog", href: "/blog" },
    { label: "Resources", href: "/resources" },
    { label: "Contact", href: "/contact" },
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
          <a href="/" className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Sedative Physio"
              className="h-10 w-auto"
            />
            <span className="font-bold text-lg md:text-xl text-black font-['system-ui']">
              Sedative Physio
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`text-sm transition-opacity font-medium pb-1 ${
                  pathname === link.href
                    ? "text-black font-bold border-b-2 border-black"
                    : "text-black hover:opacity-70"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <LoginButton />
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
                  key={link.label}
                  href={link.href}
                  className={`font-medium py-2 hover:opacity-70 ${
                    pathname === link.href ? "text-black font-bold" : "text-black"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-gray-200 pt-4 flex flex-col gap-3">
                <LoginButton />
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

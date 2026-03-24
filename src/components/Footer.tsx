"use client";

import Link from "next/link";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");

  const footerColumns = [
    {
      title: "Courses",
      links: [
        "Musculoskeletal",
        "Neurological",
        "Sports Physio",
        "Cardiopulmonary",
      ],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Blog", "Partner with Us"],
    },
    {
      title: "Support",
      links: ["FAQ", "Contact", "Help Center"],
    },
  ];

  return (
    <footer className="bg-black text-gray-300 pt-12 md:pt-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top Border Divider */}
        <div className="border-t border-gray-700 mb-8 md:mb-12"></div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 mb-10 md:mb-16">
          {/* Col 1: Branding */}
          <div>
            <h3 className="text-white font-bold text-lg md:text-xl mb-4">
              Sedative Physio
            </h3>
            <p className="text-xs md:text-sm text-gray-400 mb-6 leading-relaxed">
              India's #1 learning platform for Physiotherapy students. Expert-led clinical courses built for your career.
            </p>
            {/* Social Icons */}
            <div className="flex gap-4">
              {["Twitter", "LinkedIn", "YouTube", "Instagram"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 transition-colors text-xs"
                  aria-label={social}
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Footer Link Columns */}
          {footerColumns.map((column, index) => (
            <div key={index}>
              <h4 className="text-white font-bold text-sm md:text-base mb-4 md:mb-6">
                {column.title}
              </h4>
              <ul className="space-y-2 md:space-y-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Col 5: Newsletter */}
          <div>
            <h4 className="text-white font-bold text-sm md:text-base mb-4 md:mb-6">
              Newsletter
            </h4>
            <p className="text-xs md:text-sm text-gray-400 mb-4">
              Get weekly clinical tips
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
              />
              <button className="bg-white text-black font-bold px-3 md:px-4 py-2 md:py-2.5 rounded text-xs md:text-sm hover:bg-gray-200 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[0.8rem] text-[#94a3b8]">
            © {new Date().getFullYear()} Sedative Physio. All rights reserved.
          </p>
          <div className="flex gap-6 md:gap-8 text-[0.8rem]">
            <Link href="/privacy-policy" className="text-[#94a3b8] hover:text-gray-300 transition-colors">
              Privacy Policy
            </Link>
            <a href="#" className="text-[#94a3b8] hover:text-gray-300 transition-colors">
              Terms
            </a>
            <Link href="/contact" className="text-[#94a3b8] hover:text-gray-300 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
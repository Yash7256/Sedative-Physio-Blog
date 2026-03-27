"use client";

import Link from "next/link";
import { useState } from "react";
import { Twitter, Linkedin, Youtube, Instagram } from "lucide-react";

export function Footer() {
  const [email, setEmail] = useState("");

  const footerColumns = [
    {
      title: "Resources",
      links: [
        { label: "AI Assistant", href: "/ai-chat" },
        { label: "Notes", href: "/notes" },
        { label: "3D Models", href: "/models" },
        { label: "Journals", href: "/resources" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Podcast", href: "/podcast" },

      ],
    },
    {
      title: "Support",
      links: [
        { label: "FAQ", href: "/" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="bg-[#0a0f1a] text-gray-300 pt-16 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-12 pb-12">
          {/* Col 1: Branding */}
          <div className="max-w-[260px]">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/logo.png"
                alt="Sedative Physio"
                className="h-10 w-auto"
              />
              <span className="text-white font-bold text-lg">Sedative Physio</span>
            </div>
            {/* Tagline */}
            <p className="text-[#94a3b8] text-sm leading-[1.7] mb-6">
              India&apos;s #1 learning platform for Physiotherapy students. Expert-led clinical courses built for your career.
            </p>
            {/* Social Icons */}
            <div className="flex gap-3">
              <a href="#" aria-label="Twitter" className="social-twitter">
                <Twitter size={18} />
              </a>
              <a href="#" aria-label="LinkedIn" className="social-linkedin">
                <Linkedin size={18} />
              </a>
              <a href="#" aria-label="YouTube" className="social-youtube">
                <Youtube size={18} />
              </a>
              <a href="#" aria-label="Instagram" className="social-instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Footer Link Columns */}
          {footerColumns.map((column, index) => (
            <div key={index}>
              <h4 className="text-white text-sm font-bold tracking-[0.05em] mb-4">
                {column.title}
              </h4>
              <ul className="space-y-[10px]">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#64748b] text-sm no-underline transition-colors duration-150 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Col 5: Newsletter */}
          <div>
            <h4 className="text-white text-sm font-bold tracking-[0.05em] mb-3">
              Newsletter
            </h4>
            <p className="text-[#64748b] text-[0.8rem] mb-3">
              Get weekly clinical tips
            </p>
            <div className="flex flex-col gap-[10px]">
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-[14px] py-[10px] text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[rgba(255,255,255,0.3)] transition-colors"
              />
              <button className="w-full bg-white text-[#0a0f1a] font-bold text-sm border-none rounded-lg px-[14px] py-[10px] cursor-pointer hover:bg-[#f1f5f9] transition-all duration-200">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "24px" }}
        >
          <p className="text-[#475569] text-[0.8rem]">
            © {new Date().getFullYear()} Sedative Physio. All rights reserved.
          </p>
          <div className="flex gap-5 text-[0.8rem]">
            <Link
              href="/privacy-policy"
              className="text-[#475569] hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-[#475569] hover:text-white transition-colors"
            >
              Terms of Use
            </Link>
            <Link
              href="/contact"
              className="text-[#475569] hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .social-twitter,
        .social-linkedin,
        .social-youtube,
        .social-instagram {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }
        .social-twitter svg,
        .social-linkedin svg,
        .social-youtube svg,
        .social-instagram svg {
          color: #94a3b8;
          transition: color 0.2s ease;
        }
        .social-twitter:hover {
          transform: scale(1.1);
          background: rgba(29, 155, 240, 0.1);
        }
        .social-twitter:hover svg {
          color: #1d9bf0;
        }
        .social-linkedin:hover {
          transform: scale(1.1);
          background: rgba(10, 102, 194, 0.1);
        }
        .social-linkedin:hover svg {
          color: #0a66c2;
        }
        .social-youtube:hover {
          transform: scale(1.1);
          background: rgba(255, 0, 0, 0.1);
        }
        .social-youtube:hover svg {
          color: #ff4444;
        }
        .social-instagram:hover {
          transform: scale(1.1);
          background: rgba(225, 5, 169, 0.1);
        }
        .social-instagram:hover svg {
          color: #e105a9;
        }
      `}</style>
    </footer>
  );
}

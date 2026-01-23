"use client";

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { navlinks } from "@/constants/navlinks";
import { socials } from "@/constants/socials";
import { Navlink } from "@/types/navlink";
import { useState } from "react";
import { useChat } from "@/context/ChatContext";
import { usePathname } from "next/navigation";


export function TopNavbar() {
  const pathname = usePathname();
  const { openFullscreenChat, closeFullscreenChat, isFullscreenChatOpen } = useChat();
  
  // Convert navlinks to the format expected by the navbar
  const navItems = navlinks
    .filter(link => link.href !== '/ai-chat' && link.href !== '/') // Filter out AI chat and home since we handle them separately
    .map((link: Navlink) => ({
      name: link.label,
      link: link.href,
    }));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAiChatClick = () => {
    if (isFullscreenChatOpen) {
      closeFullscreenChat();
    } else {
      openFullscreenChat();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo>Sedative Physio</NavbarLogo>
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo>Sedative Physio</NavbarLogo>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navlinks.filter(link => link.href !== '/').map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.href}
                onClick={() => {
                  if (item.href === '/ai-chat') {
                    handleAiChatClick();
                  } else {
                    setIsMobileMenuOpen(false);
                  }
                }}
                className="relative text-neutral-600 dark:text-neutral-300 py-2"
              >
                <span className="block">{item.label}</span>
              </a>
            ))}
            
            {/* Social Links */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-neutral-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Socials</h3>
              {socials.map((social, idx) => (
                <a
                  key={`social-${idx}`}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-1 text-sm text-neutral-600 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {social.label}
                </a>
              ))}
            </div>
            

          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
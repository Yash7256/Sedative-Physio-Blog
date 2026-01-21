"use client";
import { navlinks } from "@/constants/navlinks";
import { Navlink } from "@/types/navlink";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React, { useState } from "react";
import { twMerge } from "tailwind-merge";
import { Heading } from "./Heading";
import { socials } from "@/constants/socials";
import { Badge } from "./Badge";
import { AnimatePresence, motion } from "framer-motion";
import { IconLayoutSidebarRightCollapse } from "@tabler/icons-react";
import { isMobile } from "@/lib/utils";
import { useChat } from "@/context/ChatContext";

export const Sidebar = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop Sidebar - Always visible on lg+ screens */}
      <div className="hidden lg:block w-64 bg-white border-r border-neutral-200 h-full fixed left-0 top-0 z-40">
        <div className="p-6 h-full flex flex-col">
          <SidebarHeader />
          <div className="flex-1 overflow-auto">
            <Navigation setOpen={setOpen} />
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar - Toggleable */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{
              duration: 0.3,
            }}
            className="fixed lg:hidden h-full w-full bg-white dark:bg-neutral-900 top-0 left-0 z-[100] p-10"
          >
            <div className="flex-1 overflow-auto">
              <SidebarHeader />
              <Navigation setOpen={setOpen} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile Toggle Button */}
      <button
        className="fixed lg:hidden bottom-4 right-4 h-12 w-12 bg-white border border-neutral-200 rounded-full backdrop-blur-sm flex items-center justify-center z-50 shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <IconLayoutSidebarRightCollapse className="h-6 w-6 text-secondary" />
      </button>
    </>
  );
};

export const Navigation = ({
  setOpen,
}: {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const pathname = usePathname();
  const { openFullscreenChat, closeFullscreenChat, isFullscreenChatOpen } = useChat();

  const isActive = (href: string) => pathname === href;

  return (
    <div className="flex flex-col space-y-1 my-10 relative z-[100]">
      {navlinks.map((link: Navlink) => (
        link.href === '/ai-chat' ? (
          <button
            key={link.href}
            onClick={() => {
              console.log('AI Assistant button clicked');
              // If chat is already open, close it; otherwise open it
              if (isFullscreenChatOpen) {
                closeFullscreenChat();
              } else {
                openFullscreenChat();
              }
              console.log('isMobile check:', isMobile());
              isMobile() && setOpen(false);
            }}
            className={twMerge(
              "text-secondary hover:text-primary transition duration-200 flex items-center space-x-2 py-2 px-2 rounded-md text-sm w-full text-left",
              isActive(link.href) && "bg-white shadow-lg text-primary"
            )}
          >
            <link.icon
              className={twMerge(
                "h-4 w-4 flex-shrink-0",
                isActive(link.href) && "text-sky-500"
              )}
            />
            <span>{link.label}</span>
          </button>
        ) : (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => {
              if (isMobile()) {
                setOpen(false);
              }
              // Close fullscreen chat when navigating to other pages
              if (pathname === '/ai-chat' || isFullscreenChatOpen) {
                closeFullscreenChat();
              }
            }}
            className={twMerge(
              "text-secondary hover:text-primary transition duration-200 flex items-center space-x-2 py-2 px-2 rounded-md text-sm",
              isActive(link.href) && "bg-white shadow-lg text-primary"
            )}
          >
            <link.icon
              className={twMerge(
                "h-4 w-4 flex-shrink-0",
                isActive(link.href) && "text-sky-500"
              )}
            />
            <span>{link.label}</span>
          </Link>
        )
      ))}

      <Heading as="p" className="text-sm md:text-sm lg:text-sm pt-10 px-2">
        Socials
      </Heading>
      {socials.map((link: Navlink) => (
        <Link
          key={link.href}
          href={link.href}
          className={twMerge(
            "text-secondary hover:text-primary transition duration-200 flex items-center space-x-2 py-2 px-2 rounded-md text-sm"
          )}
        >
          <link.icon
            className={twMerge(
              "h-4 w-4 flex-shrink-0",
              isActive(link.href) && "text-sky-500"
            )}
          />
          <span>{link.label}</span>
        </Link>
      ))}
    </div>
  );
};

const SidebarHeader = () => {
  return (
    <div className="flex space-x-2">
      <Image
        src="https://i.ibb.co/7xy18m8N/Whats-App-Image-2026-01-19-at-11-57-21-PM.jpg"
        alt="Akshay Kumar"
        height="40"
        width="40"
        className="object-cover object-top rounded-full flex-shrink-0"
      />
      <div className="flex text-sm flex-col">
        <p className="font-bold text-primary">Dr. Akshay Kumar</p>
        <p className="font-light text-secondary">Physiotherapist & Researcher</p>
      </div>
    </div>
  );
};

"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface NavbarContextType {
  isMobile: boolean;
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export const useNavbar = () => {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return context;
};

interface NavbarProps {
  children: ReactNode;
  className?: string;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const contextValue: NavbarContextType = {
    isMobile,
    mobileMenuOpen,
    toggleMobileMenu,
  };

  return (
    <NavbarContext.Provider value={contextValue}>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 dark:border-neutral-700 dark:bg-neutral-900/90",
          className
        )}
      >
        {children}
      </nav>
    </NavbarContext.Provider>
  );
};

interface NavBodyProps {
  children: ReactNode;
  className?: string;
}

export const NavBody = ({ children, className }: NavBodyProps) => {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 md:px-8",
        className
      )}
    >
      {children}
    </div>
  );
};

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
}

export const NavItems = ({ items, className }: NavItemsProps) => {
  return (
    <div className={cn("hidden md:flex md:space-x-10", className)}>
      {items.map((item, idx) => (
        <a
          key={`nav-item-${idx}`}
          href={item.link}
          className="relative text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        >
          {item.name}
        </a>
      ))}
    </div>
  );
};

interface NavbarButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
  onClick?: () => void;
}

export const NavbarButton = ({
  children,
  variant = "primary",
  className,
  onClick,
}: NavbarButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        variant === "primary"
          ? "bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          : "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
        className
      )}
    >
      {children}
    </button>
  );
};

interface NavbarLogoProps {
  children?: ReactNode;
  className?: string;
}

export const NavbarLogo = ({ children, className }: NavbarLogoProps) => {
  return (
    <a
      href="/"
      className={cn(
        "text-xl font-bold text-gray-900 dark:text-white",
        className
      )}
    >
      {children || "MedScience Physio"}
    </a>
  );
};

interface MobileNavProps {
  children: ReactNode;
}

export const MobileNav = ({ children }: MobileNavProps) => {
  const { mobileMenuOpen } = useNavbar();
  
  return (
    <div className="md:hidden">
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-0 z-10 origin-top-right bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black ring-opacity-5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MobileNavHeaderProps {
  children: ReactNode;
}

export const MobileNavHeader = ({ children }: MobileNavHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-700 px-4 py-3 sm:px-6 md:px-8">
      {children}
    </div>
  );
};

interface MobileNavToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const MobileNavToggle = ({
  isOpen,
  onClick,
  className,
}: MobileNavToggleProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
        className
      )}
    >
      {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
    </button>
  );
};

interface MobileNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const MobileNavMenu = ({
  isOpen,
  onClose,
  children,
}: MobileNavMenuProps) => {
  return (
    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
      {children}
    </div>
  );
};
import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-6 border-t border-neutral-200 flex items-center justify-between px-10">
      <div className="text-sm text-gray-500">
        © {new Date().getFullYear()} Sedative Physio. All rights reserved.
      </div>
      <div className="text-sm text-gray-500">
      
      </div>
    </footer>
  );
}
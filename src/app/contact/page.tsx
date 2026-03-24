"use client";

import { Contact } from "@/components/Contact";
import { socials } from "@/constants/socials";
import { IconBrandLinkedin, IconBrandTwitter, IconBrandYoutube, IconMail, IconMapPin, IconPhone, IconBolt } from "@tabler/icons-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 md:py-20">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="text-center pt-12 pb-8">
          <h1 className="text-[2.5rem] font-extrabold text-gray-900 mb-4">
            Get in Touch
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Have a question or want to learn more? Send me a message and I&apos;ll respond within 48 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl border border-[#f1f5f9] p-8 self-start shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Send a Message
            </h2>
            <Contact />
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-[#f1f5f9] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Contact Information
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#f1f5f9] rounded-lg">
                    <IconMail className="w-6 h-6 text-[#3b82f6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[0.95rem] mb-1">Email</h3>
                    <p className="text-[0.875rem] text-[#64748b]">sedativephysio@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#f1f5f9] rounded-lg">
                    <IconPhone className="w-6 h-6 text-[#10b981]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[0.95rem] mb-1">Phone</h3>
                    <p className="text-[0.875rem] text-[#64748b]">+91 9060627610</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#f1f5f9] rounded-lg">
                    <IconMapPin className="w-6 h-6 text-[#8b5cf6]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-[0.95rem] mb-1">Location</h3>
                    <p className="text-[0.875rem] text-[#64748b]">Bihar India</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#f1f5f9] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Connect With Me
              </h2>
              <div className="flex gap-4">
                <a
                  href="https://www.linkedin.com/in/drakshayy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-[#e2e8f0] rounded-xl hover:bg-[#e8f0fe] transition-all duration-200 hover:scale-110"
                  aria-label="LinkedIn"
                >
                  <IconBrandLinkedin className="w-6 h-6 text-[#64748b] hover:text-[#0a66c2] transition-colors" />
                </a>
                <a
                  href="https://youtube.com/@sedativephysio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-[#e2e8f0] rounded-xl hover:bg-[#fff0f0] transition-all duration-200 hover:scale-110"
                  aria-label="YouTube"
                >
                  <IconBrandYoutube className="w-6 h-6 text-[#64748b] hover:text-[#ff0000] transition-colors" />
                </a>
              </div>
              <p className="text-center text-[0.8rem] text-[#94a3b8] mt-4">
                Follow for physio tips & course updates
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

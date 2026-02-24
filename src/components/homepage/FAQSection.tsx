"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    id: 1,
    question: "Are courses aligned with BPT university syllabus?",
    answer:
      "Yes, all our courses are designed to align with the BPT curriculum across Indian universities. Our expert instructors have reviewed content against university syllabi from AICTE, State University of New York, and other regulatory bodies. Each course covers both theoretical foundations and practical clinical applications required for your degree.",
  },
  {
    id: 2,
    question: "Can I access courses on mobile?",
    answer:
      "Absolutely! Sedative Physio is fully responsive and works seamlessly on smartphones, tablets, and desktops. You can download videos for offline viewing, making it perfect for studying during clinicals or while commuting. The mobile app is coming soon for an even better experience.",
  },
  {
    id: 3,
    question: "Are certifications recognized by hospitals?",
    answer:
      "Our certifications are recognized by 200+ partner hospitals, clinics, and healthcare organizations across India. Many students have used Sedative Physio certificates to stand out during internship selections and job interviews. The certificates are digitally verifiable and shareable on LinkedIn.",
  },
  {
    id: 4,
    question: "What if I miss a live class?",
    answer:
      "All live classes are recorded and available immediately after the session. You can watch the recording with access to the same materials, PDFs, and Q&A discussion thread. Many students actually prefer reviewing live class recordings to catch details they might have missed.",
  },
  {
    id: 5,
    question: "Is there a free plan or trial?",
    answer:
      "Yes! We offer free access to select courses and trial content. You can watch sample lessons, access introductory modules, and get a feel for the platform without any credit card required. Paid plans unlock full courses with lifetime access, live classes, and certificates.",
  },
  {
    id: 6,
    question: "Are courses available in Hindi as well as English?",
    answer:
      "Currently, all courses are offered in English to maintain clinical consistency and align with university requirements. Hindi subtitles for select courses are coming in Q2 2026. You can request specific content in Hindi through your account settings.",
  },
];

function AccordionItem({ item, isOpen, onToggle }: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      key={item.id}
      className="border-b border-gray-200 py-6 md:py-8 last:border-b-0"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 md:gap-6 group"
      >
        <h3 className="text-lg md:text-xl font-bold text-black text-left group-hover:opacity-70 transition-opacity">
          {item.question}
        </h3>
        <div
          className={`flex-shrink-0 pt-1 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={24} className="text-black" strokeWidth={3} />
        </div>
      </button>

      {/* Answer */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <p className="text-base md:text-lg text-gray-700 pt-4 md:pt-6 leading-relaxed">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <section className="w-full bg-white py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black text-center mb-12 md:mb-16">
          Frequently Asked Questions
        </h2>

        {/* FAQ Items */}
        <div>
          {faqItems.map((item) => (
            <AccordionItem
              key={item.id}
              item={item}
              isOpen={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

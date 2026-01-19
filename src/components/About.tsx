"use client";
import { Paragraph } from "@/components/Paragraph";
import Image from "next/image";

import { motion } from "framer-motion";

export function About() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="py-20">
        <div className="text-center">
          <div className="text-4xl mb-4">👨‍⚕️</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="text-blue-600">Akshay Kumar</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Hey there, I&apos;m Akshay Kumar - a passionate physiotherapist, dedicated educator,
            and enthusiastic researcher. I specialize in rehabilitation medicine and movement science,
            constantly exploring innovative approaches to patient care and professional development.
          </p>
        </div>
      </div>
    </div>
  );
}

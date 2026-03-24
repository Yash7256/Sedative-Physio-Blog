"use client";

import { useEffect } from "react";
import { cn } from "@/components/ui/resizable-navbar";
import { 
  IconTarget, 
  IconEye, 
  IconBrain, 
  IconBone, 
  IconHeart, 
  IconBarbell, 
  IconBrandYoutube, 
  IconBrandLinkedin
} from "@tabler/icons-react";
import Link from "next/link";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";

function HeroBanner() {
  return (
    <section className="bg-[#f8fafc] py-16 md:py-[64px] px-6 md:px-6">
      <div className="max-w-4xl mx-auto text-center">

        <h1 className="text-3xl md:text-[3rem] font-extrabold text-[#1e293b] max-w-[640px] mx-auto mb-4 leading-tight">
          About Sedative Physio
        </h1>
        <p className="text-[1.05rem] text-[#64748b] max-w-[560px] mx-auto leading-[1.8]">
          Sedative Physio is a dedicated learning platform built to make
          high-quality physiotherapy education accessible to every student
          and practitioner, wherever they are.
        </p>
      </div>
    </section>
  );
}

function MissionVision() {
  return (
    <section className="bg-white py-16 md:py-[64px] px-6 md:px-6">
      <div className="max-w-[1100px] mx-auto">

        <h2 className="text-2xl md:text-[2rem] font-extrabold text-[#1e293b] mb-10">
          Why Sedative Physio Exists
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-8">
            <div className="w-11 h-11 rounded-[10px] bg-[#eff6ff] flex items-center justify-center mb-5">
              <IconTarget className="w-5 h-5 text-[#3b82f6]" stroke={2} />
            </div>
            <h3 className="text-xl font-bold text-[#1e293b] mb-3">Our Mission</h3>
            <p className="text-[#64748b] leading-[1.7]">
              To democratise physiotherapy education by providing structured,
              clinically grounded, and engaging learning resources, supported
              by 3D models, detailed notes, and practical insights, that
              empower students to excel in their careers.
            </p>
          </div>
          
          <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl p-8">
            <div className="w-11 h-11 rounded-[10px] bg-[#f5f3ff] flex items-center justify-center mb-5">
              <IconEye className="w-5 h-5 text-[#8b5cf6]" stroke={2} />
            </div>
            <h3 className="text-xl font-bold text-[#1e293b] mb-3">Our Vision</h3>
            <p className="text-[#64748b] leading-[1.7]">
              To become the most trusted physiotherapy learning platform in
              India and beyond, where every student, regardless of their
              institution or location, has access to world-class education
              and mentorship.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CourseOfferings() {
  const courses = [
    {
      icon: IconBrain,
      iconColor: "#8b5cf6",
      iconBg: "bg-[#f5f3ff]",
      title: "Neurological Physiotherapy",
      desc: "In-depth coverage of neurological conditions, assessment techniques, and evidence-based rehabilitation strategies."
    },
    {
      icon: IconBone,
      iconColor: "#3b82f6",
      iconBg: "bg-[#eff6ff]",
      title: "Anatomy",
      desc: "Detailed human anatomy modules supported by interactive 3D models and clinical relevance at every step."
    },
    {
      icon: IconHeart,
      iconColor: "#ef4444",
      iconBg: "bg-[#fef2f2]",
      title: "Musculoskeletal Physiotherapy",
      desc: "Orthopaedic and musculoskeletal assessment, diagnosis, and manual therapy techniques explained clearly."
    },
    {
      icon: IconBarbell,
      iconColor: "#f59e0b",
      iconBg: "bg-[#fffbeb]",
      title: "Sports Physiotherapy",
      desc: "Sports injury management, prevention protocols, and return-to-sport rehabilitation frameworks."
    }
  ];

  return (
    <section className="bg-[#f8fafc] py-16 md:py-[64px] px-6 md:px-6">
      <div className="max-w-[1100px] mx-auto">

        <h2 className="text-2xl md:text-[2rem] font-extrabold text-[#1e293b] mb-4">
          Courses Offered
        </h2>
        <p className="text-[#64748b] mb-10 max-w-2xl">
          Comprehensive, structured courses built around the core subjects of physiotherapy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course, index) => (
            <div
              key={index}
              className="bg-white border border-[#f1f5f9] rounded-2xl p-7 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
            >
              <div className={cn("w-11 h-11 rounded-[10px] flex items-center justify-center mb-5", course.iconBg)}>
                <course.icon className="w-5 h-5" style={{ color: course.iconColor }} stroke={2} />
              </div>
              <h3 className="text-lg font-bold text-[#1e293b] mb-3">{course.title}</h3>
              <p className="text-[#64748b] leading-[1.7] text-[0.925rem]">{course.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AuthorCard() {
  const credentials = ["BPT — IIHER", "COMT Certified", "NDT Certified", "ACLS · PALS · BLS", "WHO Certified"];
  
  const stats = [
    { value: "3+ Years", label: "Clinical Experience" },
    { value: "3 yrs 7 mo", label: "Teaching at Sedative Physio" },
    { value: "5+", label: "Certifications" }
  ];

  return (
    <section className="bg-[#f8fafc] py-16 md:py-[64px] px-6 md:px-6">
      <div className="max-w-[1100px] mx-auto text-center">

        <h2 className="text-2xl md:text-[2rem] font-extrabold text-[#1e293b] mb-4">
          Meet The Founder
        </h2>
        <p className="text-[#64748b] mb-12 max-w-xl mx-auto">
          The physiotherapist, educator, and creator behind Sedative Physio.
        </p>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-[#f1f5f9] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="w-24 h-24 rounded-full mx-auto mb-6 overflow-hidden border-4 border-[#f1f5f9]">
              <img
                src="https://jibonryxreoezswvydnd.supabase.co/storage/v1/object/public/images/WhatsApp%20Image%202026-01-19%20at%2011.57.21%20PM.jpeg"
                alt="Dr. Akshay Kumar PT"
                className="w-full h-full object-cover"
              />
            </div>

            <h3 className="text-xl font-bold text-[#1e293b] mb-1">Dr. Akshay Kumar PT</h3>
            <p className="text-[#64748b] text-sm mb-4">Physiotherapist & Educator</p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {credentials.map((cred, index) => (
                <span
                  key={index}
                  className="text-[0.7rem] font-medium bg-[#f0f9ff] text-[#0369a1] border border-[#bae6fd] rounded-full px-3 py-1"
                >
                  {cred}
                </span>
              ))}
            </div>

            <p className="text-[#64748b] text-[0.875rem] leading-[1.7] text-left mb-6">
              With over 3 years of clinical experience spanning musculoskeletal,
              neurological, and sports physiotherapy, Dr. Akshay Kumar founded
              Sedative Physio to bridge the gap between clinical practice and
              accessible education. Based in Patna, Bihar, he currently runs
              Moksh Physiotherapy clinic alongside building courses that have
              helped hundreds of BPT and MPT students master complex subjects
              through 3D models, structured notes, and practical insights.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#f1f5f9]">
              {stats.map((stat, index) => (
                <div key={index}>
                  <p className="text-lg font-bold text-[#1e293b]">{stat.value}</p>
                  <p className="text-[0.7rem] text-[#94a3b8]">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 mt-6">
              <a
                href="https://youtube.com/@sedativephysio"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#fef2f2] rounded-xl hover:bg-[#fee2e2] transition-colors"
                aria-label="YouTube"
              >
                <IconBrandYoutube className="w-5 h-5 text-[#ef4444]" stroke={2} />
              </a>
              <a
                href="https://www.linkedin.com/in/drakshayy/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-[#e8f0fe] rounded-xl hover:bg-[#dbeafe] transition-colors"
                aria-label="LinkedIn"
              >
                <IconBrandLinkedin className="w-5 h-5 text-[#0a66c2]" stroke={2} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="bg-white py-16 md:py-[64px] px-6 md:px-6">
      <TestimonialsSection />
    </section>
  );
}

function CTABanner() {
  return (
    <section className="bg-[#1e293b] py-16 md:py-[64px] px-6 md:px-6">
      <div className="max-w-[1100px] mx-auto text-center">
        <h2 className="text-2xl md:text-[2rem] font-extrabold text-white mb-4">
          Ready to Advance Your Physiotherapy Career?
        </h2>
        <p className="text-[#94a3b8] text-[1rem] mb-10 max-w-xl mx-auto">
          Join hundreds of students learning with Sedative Physio.
          Start with our free content or explore our full course library.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/courses"
            className="px-7 py-3 bg-white text-[#1e293b] rounded-[10px] font-bold text-sm hover:bg-[#f1f5f9] transition-all duration-200"
          >
            Explore Courses
          </Link>
          <a
            href="https://youtube.com/@sedativephysio"
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3 bg-transparent border border-white/30 text-white rounded-[10px] text-sm hover:border-white transition-all duration-200"
          >
            Watch Free on YouTube
          </a>
        </div>
      </div>
    </section>
  );
}

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About — Sedative Physio";
  }, []);

  return (
    <main>
      <HeroBanner />
      <MissionVision />
      <CourseOfferings />
      <AuthorCard />
      <Testimonials />
      <CTABanner />
    </main>
  );
}

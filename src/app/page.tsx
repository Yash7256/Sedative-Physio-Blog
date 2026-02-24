import { HeroSection } from "@/components/homepage/HeroSection";
import { TrustedBySection } from "@/components/homepage/TrustedBySection";
import { StatsSection } from "@/components/homepage/StatsSection";
import { SpecializationSection } from "@/components/homepage/SpecializationSection";
import { CertificationsSection } from "@/components/homepage/CertificationsSection";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { BlogPreviewSection } from "@/components/homepage/BlogPreviewSection";
import { FAQSection } from "@/components/homepage/FAQSection";

export default function Home() {
  return (
    <div className="w-full bg-white">
      <main className="pt-12">
        <HeroSection />
        <TrustedBySection />
        <StatsSection />
        <TestimonialsSection />
        <SpecializationSection />
        <CertificationsSection />
        <BlogPreviewSection />
        <FAQSection />
      </main>
    </div>
  );
}
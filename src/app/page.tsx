import { AnnouncementBar } from "@/components/homepage/AnnouncementBar";
import { StickyNavbar } from "@/components/homepage/StickyNavbar";
import { HeroSection } from "@/components/homepage/HeroSection";
import { StatsSection } from "@/components/homepage/StatsSection";
import { PositioningSection } from "@/components/homepage/PositioningSection";
import { SpecializationSection } from "@/components/homepage/SpecializationSection";
import { CertificationsSection } from "@/components/homepage/CertificationsSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";
import { TestimonialsSection } from "@/components/homepage/TestimonialsSection";
import { PlatformPreviewSection } from "@/components/homepage/PlatformPreviewSection";
import { TrustedBySection } from "@/components/homepage/TrustedBySection";
import { BlogPreviewSection } from "@/components/homepage/BlogPreviewSection";
import { FAQSection } from "@/components/homepage/FAQSection";
import { FinalCTASection } from "@/components/homepage/FinalCTASection";

export default function Home() {
  return (
    <div className="w-full bg-white">
      <AnnouncementBar />
      <StickyNavbar />
      <main className="pt-12">
        <HeroSection />
        <StatsSection />
        <PositioningSection />
        <SpecializationSection />
        <CertificationsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PlatformPreviewSection />
        <TrustedBySection />
        <BlogPreviewSection />
        <FAQSection />
        <FinalCTASection />
      </main>
    </div>
  );
}
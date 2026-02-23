"use client";

export function CertificationsSection() {
  return (
    <section className="w-full bg-black text-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left: Certificate Mockup */}
          <div className="flex justify-center md:justify-start">
            <img 
              src="/images/certificate.png" 
              alt="Certificate of Completion" 
              className="w-full max-w-2xl rounded-lg shadow-2xl"
            />
          </div>

          {/* Right: Content */}
          <div>
            <p className="text-gray-400 text-sm md:text-base font-medium mb-4 md:mb-6">
              Certifications
            </p>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-8 md:mb-12">
              Earn Credentials That Advance Your Clinical Career
            </h2>

            {/* Benefits */}
            <div className="space-y-4 md:space-y-5 mb-8 md:mb-10">
              {[
                "Verified digital certificate on completion",
                "Shareable directly to LinkedIn",
                "Recognized by partner hospitals & clinics",
                "Covers competencies assessors look for",
              ].map((benefit, index) => (
                <div key={index} className="flex gap-3 md:gap-4">
                  <span className="flex-shrink-0 text-white text-lg md:text-xl">
                    ✓
                  </span>
                  <p className="text-base md:text-lg text-gray-300">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>

            {/* Tracks */}
            <div className="mb-8 md:mb-10 pb-8 md:pb-10 border-b border-gray-700">
              <p className="text-gray-400 text-sm md:text-base mb-3 md:mb-4">
                Available for:
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  "Clinical Assessment",
                  "Sports Physio",
                  "Neurological Rehab",
                  "Cardiopulmonary",
                ].map((track) => (
                  <span
                    key={track}
                    className="text-sm md:text-base text-gray-300"
                  >
                    {track}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button className="px-8 md:px-10 py-3 md:py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
              Earn Your First Certificate →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

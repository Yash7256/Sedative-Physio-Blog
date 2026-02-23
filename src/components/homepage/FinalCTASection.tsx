"use client";

export function FinalCTASection() {
  return (
    <section className="w-full bg-black text-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 leading-tight">
          Your Clinical Education Shouldn't Depend on Outdated Textbooks.
        </h2>

        <p className="text-lg md:text-xl text-gray-300 mb-8 md:mb-12 leading-relaxed">
          Join 15,000+ BPT students already learning on Sedative Physio.
        </p>

        <button className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-bold rounded-full hover:bg-gray-100 transition-colors text-base md:text-lg mb-6 md:mb-8">
          Create Free Account
        </button>

        <p className="text-sm md:text-base text-gray-400">
          No credit card required · Free plan available
        </p>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";

interface Stat {
  number: string;
  label: string;
}

const stats: Stat[] = [
  { number: "600+", label: "Students Enrolled" },
  { number: "1500+", label: "Hours Of Content" },
  { number: "4.8★", label: "Average Course Rating" },
];

function AnimatedNumber({
  value,
  suffix = "",
}: {
  value: string;
  suffix?: string;
}) {
  const [displayValue, setDisplayValue] = useState("0");
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);

          // Extract numeric part
          const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
          const steps = 50;
          const increment = numericValue / steps;

          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= numericValue) {
              setDisplayValue(value);
              clearInterval(timer);
            } else {
              setDisplayValue(
                Math.floor(current).toLocaleString() +
                  (value.includes("+") ? "+" : "")
              );
            }
          }, 30);

          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [value, hasStarted]);

  return <span ref={ref}>{displayValue}</span>;
}

export function StatsSection() {
  return (
    <section className="w-full bg-black text-white py-6 md:py-8 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`py-2 md:py-4 text-center ${
                index < stats.length - 1
                  ? "border-b md:border-b-0 md:border-r border-gray-700"
                  : ""
              }`}
            >
              <div className="text-3xl md:text-5xl font-bold text-white mb-2">
                <AnimatedNumber value={stat.number} />
              </div>
              <p className="text-sm md:text-base text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

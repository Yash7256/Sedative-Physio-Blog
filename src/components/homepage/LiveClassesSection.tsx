"use client";

import { useState, useEffect } from "react";

interface LiveClass {
  id: number;
  title: string;
  instructor: string;
  credentials: string;
  date: string;
  time: string;
  seatsRemaining: number;
  totalSeats: number;
  endsAt: Date;
}

function CountdownTimer({ endsAt }: { endsAt: Date }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = endsAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <div className="flex gap-2 md:gap-3 text-center">
      <div>
        <div className="text-lg md:text-2xl font-bold text-black">
          {timeLeft.days}
        </div>
        <div className="text-xs md:text-sm text-gray-600">days</div>
      </div>
      <div className="text-lg md:text-2xl text-gray-400">:</div>
      <div>
        <div className="text-lg md:text-2xl font-bold text-black">
          {String(timeLeft.hours).padStart(2, "0")}
        </div>
        <div className="text-xs md:text-sm text-gray-600">hrs</div>
      </div>
      <div className="text-lg md:text-2xl text-gray-400">:</div>
      <div>
        <div className="text-lg md:text-2xl font-bold text-black">
          {String(timeLeft.minutes).padStart(2, "0")}
        </div>
        <div className="text-xs md:text-sm text-gray-600">min</div>
      </div>
    </div>
  );
}

const liveClasses: LiveClass[] = [
  {
    id: 1,
    title: "ACL Reconstruction: Pre & Post-Op Rehab",
    instructor: "Dr. Vikram Patel",
    credentials: "MPT Sports · St. John's Medical · 9 yrs",
    date: "Feb 28, 2026",
    time: "7:00 PM IST",
    seatsRemaining: 12,
    totalSeats: 50,
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    title: "Cervical Radiculopathy: Assessment & Technique",
    instructor: "Dr. Neha Singh",
    credentials: "MPT Ortho · Max Healthcare · 7 yrs",
    date: "Mar 1, 2026",
    time: "6:00 PM IST",
    seatsRemaining: 8,
    totalSeats: 40,
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    title: "Neuroplasticity in Stroke Recovery",
    instructor: "Dr. Rajesh Kumar",
    credentials: "MPT Neuro · AIIMS Delhi · 11 yrs",
    date: "Mar 2, 2026",
    time: "5:30 PM IST",
    seatsRemaining: 5,
    totalSeats: 50,
    endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  },
];

export function LiveClassesSection() {
  return (
    <section className="w-full bg-white py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <p className="text-center text-gray-600 text-sm md:text-base font-medium mb-4 md:mb-6">
          Live Classes
        </p>
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-black text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          Learn Live with Clinical Experts
        </h2>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          {liveClasses.map((liveClass) => (
            <div
              key={liveClass.id}
              className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Top Border Accent */}
              <div className="h-1 bg-black"></div>

              {/* Content */}
              <div className="p-6 md:p-8">
                {/* Live Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold">
                    🔴 LIVE
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-black mb-6">
                  {liveClass.title}
                </h3>

                {/* Instructor */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gray-300"></div>
                  <div>
                    <p className="font-bold text-sm md:text-base text-black">
                      {liveClass.instructor}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {liveClass.credentials}
                    </p>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-2 text-gray-600 text-sm md:text-base mb-4">
                  <span>📅</span>
                  <span>
                    {liveClass.date} at {liveClass.time}
                  </span>
                </div>

                {/* Seats Remaining */}
                <div className="mb-6">
                  <p className="text-black font-bold text-sm md:text-base mb-2">
                    Only {liveClass.seatsRemaining} seats left
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-black"
                      style={{
                        width: `${(liveClass.seatsRemaining / liveClass.totalSeats) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Countdown */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <p className="text-gray-600 text-xs md:text-sm font-medium mb-3">
                    Starts in:
                  </p>
                  <CountdownTimer endsAt={liveClass.endsAt} />
                </div>

                {/* CTA Button */}
                <button className="w-full py-2.5 md:py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors">
                  Reserve Free Seat
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View Schedule Link */}
        <div className="flex justify-center">
          <a
            href="#"
            className="text-black font-bold text-base md:text-lg hover:opacity-70 transition-opacity inline-flex items-center gap-2"
          >
            View Full Schedule →
          </a>
        </div>
      </div>
    </section>
  );
}

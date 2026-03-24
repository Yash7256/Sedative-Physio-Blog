"use client";
import React, { useState } from "react";
import Link from "next/link";

const SUPABASE_FUNCTION_URL = "https://jibonryxreoezswvydnd.supabase.co/functions/v1/send-contact-email";

const defaultFormState = {
  name: {
    value: "",
    error: "",
  },
  email: {
    value: "",
    error: "",
  },
  message: {
    value: "",
    error: "",
  },
};

type Status = 'idle' | 'success' | 'error';

export const Contact = () => {
  const [formData, setFormData] = useState(defaultFormState);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');

    const name = formData.name.value.trim();
    const email = formData.email.value.trim();
    const message = formData.message.value.trim();

    if (!name || !email || !message) {
      setStatus('error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus('error');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        setStatus('success');
        setFormData(defaultFormState);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="flex flex-col md:flex-row justify-between gap-5">
        <input
          type="text"
          placeholder="Your Name"
          className="bg-white border-[1.5px] border-[#e2e8f0] focus:outline-none focus:border-[#1e293b] focus:ring-[3px] focus:ring-[rgba(30,41,59,0.08)] rounded-lg px-3 py-2.5 text-sm text-gray-900 w-full placeholder:text-gray-400 transition-all duration-200"
          value={formData.name.value}
          onChange={(e) => {
            setFormData({
              ...formData,
              name: {
                value: e.target.value,
                error: "",
              },
            });
          }}
        />
        <input
          type="email"
          placeholder="Your email address"
          className="bg-white border-[1.5px] border-[#e2e8f0] focus:outline-none focus:border-[#1e293b] focus:ring-[3px] focus:ring-[rgba(30,41,59,0.08)] rounded-lg px-3 py-2.5 text-sm text-gray-900 w-full placeholder:text-gray-400 transition-all duration-200"
          value={formData.email.value}
          onChange={(e) => {
            setFormData({
              ...formData,
              email: {
                value: e.target.value,
                error: "",
              },
            });
          }}
        />
      </div>
      <div>
        <textarea
          placeholder="Your Message"
          rows={6}
          style={{ minHeight: "140px" }}
          className="bg-white border-[1.5px] border-[#e2e8f0] focus:outline-none focus:border-[#1e293b] focus:ring-[3px] focus:ring-[rgba(30,41,59,0.08)] px-3 mt-5 py-2.5 rounded-lg text-sm text-gray-900 w-full placeholder:text-gray-400 transition-all duration-200 resize-vertical"
          value={formData.message.value}
          onChange={(e) => {
            setFormData({
              ...formData,
              message: {
                value: e.target.value,
                error: "",
              },
            });
          }}
        />
      </div>
      <button
        className="w-full px-6 py-3 mt-6 bg-gray-900 hover:bg-[#374151] rounded-[10px] font-semibold text-white transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Submit Message'}
      </button>

      {status === 'success' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-[#16a34a] text-sm font-medium">Message sent successfully!</p>
          <p className="text-[#64748b] text-xs mt-1">We&apos;ll get back to you within 48 hours.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-[#dc2626] text-sm font-medium">Something went wrong.</p>
          <p className="text-[#64748b] text-xs mt-1">Please try again later.</p>
        </div>
      )}

      {status === 'idle' && (
        <>
          <p className="text-center text-[0.8rem] text-[#64748b] mt-4">
            ⏱ We&apos;ll get back to you within 48 hours
          </p>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '12px' }}>
            By submitting this form, you agree to our{' '}
            <Link href="/privacy-policy" style={{ color: '#64748b', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
          </p>
        </>
      )}
    </form>
  );
};

"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Privacy Policy — Sedative Physio';
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main>
        <div style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '8px' }}>
            Last updated: 23 March 2026
          </p>
        </div>

        <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 24px 64px' }}>
          <div className="privacy-card" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            padding: '40px 48px'
          }}>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: 0, marginBottom: '10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                1. Introduction
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Welcome to Sedative Physio (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), operated by Akshay Kumar. This Privacy Policy explains how we collect, use, and protect your personal information when you visit{' '}
                <a href="https://sedativephysio.com" style={{ color: '#3b82f6' }}>https://sedativephysio.com</a>.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                By using this website, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                2. Information We Collect
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We may collect the following types of personal information:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Full name</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Email address</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Messages and form submissions</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Payment information</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Usage and analytics data</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Cookies and tracking data</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We collect this information when you fill out a contact form, create an account, purchase a course, or interact with our website.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                3. How We Use Your Information
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We use the information we collect to:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Respond to your inquiries and contact form submissions</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Improve and maintain the website</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Send you marketing communications (with your consent)</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Deliver courses and educational content</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We will never use your data for purposes incompatible with those listed above without first obtaining your consent.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                4. Data Sharing and Third Parties
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We do not sell, trade, or share your personal data with third parties under any circumstances.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                5. Data Retention
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We retain your personal data for 1 year, or for as long as necessary to fulfil the purposes outlined in this policy. After this period, your data will be securely deleted or anonymised.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                6. Data Security
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                This website uses SSL encryption (HTTPS) to protect data in transit. We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                7. Cookies
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We use cookies to enhance your browsing experience. Cookies are small text files stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of the website may not function properly without cookies.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                8. Your Rights
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569', fontWeight: 600 }}>
                GDPR — EU/EEA Users
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Under the General Data Protection Regulation (GDPR), if you are located in the EU/EEA, you have the right to:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Access the personal data we hold about you</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Request correction of inaccurate data</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Object to or restrict processing of your data</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Data portability</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Withdraw consent at any time</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                To exercise these rights, contact us at{' '}
                <a href="mailto:sedativephysio@gmail.com" style={{ color: '#3b82f6' }}>sedativephysio@gmail.com</a>.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569', fontWeight: 600, marginTop: '16px' }}>
                CCPA — California Residents
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Under the California Consumer Privacy Act (CCPA), California residents have the right to:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Know what personal data is collected about them</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Request deletion of personal data</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Opt out of the sale of personal data</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Non-discrimination for exercising CCPA rights</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                To exercise these rights, contact us at{' '}
                <a href="mailto:sedativephysio@gmail.com" style={{ color: '#3b82f6' }}>sedativephysio@gmail.com</a>.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                9. Children&apos;s Privacy
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                This website is not directed at children under the age of 13. We do not knowingly collect personal data from children under 13. If you believe we have inadvertently collected such data, please contact us immediately and we will delete it.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                10. Links to Other Websites
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of those sites. We encourage you to review the privacy policies of any external sites you visit.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                11. Changes to This Policy
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                12. Contact Us
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px 20px', marginTop: '12px' }}>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Name:</strong> Akshay Kumar</p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Email:</strong>{' '}
                  <a href="mailto:sedativephysio@gmail.com" style={{ color: '#3b82f6' }}>sedativephysio@gmail.com</a>
                </p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Website:</strong>{' '}
                  <a href="https://sedativephysio.com" style={{ color: '#3b82f6' }}>https://sedativephysio.com</a>
                </p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Jurisdiction:</strong> India</p>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .privacy-card {
            padding: 24px 20px !important;
          }
        }
      ` }} />
    </div>
  );
}

"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Terms of Use — Sedative Physio';
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <main>
        <div style={{ textAlign: 'center', padding: '48px 24px 32px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            Terms of Use
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '8px' }}>
            Last updated: 25 March 2026
          </p>
        </div>

        <div style={{ maxWidth: '740px', margin: '0 auto', padding: '0 24px 64px' }}>
          <div className="terms-card" style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            padding: '40px 48px'
          }}>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: 0, marginBottom: '10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                1. Acceptance of Terms
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                By accessing or using the Sedative Physio website at{' '}
                <a href="https://sedativephysio.com" style={{ color: '#3b82f6' }}>https://sedativephysio.com</a>
                {' '}(&quot;the Platform&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;). These Terms apply to all visitors, registered users, and paying customers.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                If you do not agree to these Terms, you must not use the Platform.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                2. About the Platform
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Sedative Physio is an online physiotherapy education platform operated by Akshay Kumar, providing:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Paid courses on physiotherapy subjects (Anatomy, Neurological PT, Musculoskeletal PT, Sports PT)</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Free educational content via YouTube</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Interactive 3D anatomical models</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Study notes and downloadable resources</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>An AI-powered chatbot for learning assistance</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Access to third-party academic journals and references</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>A contact form for user inquiries</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                3. User Accounts
              </h2>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>3.1 Registration</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                To access paid courses and certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>3.2 Account Security</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                You are responsible for maintaining the confidentiality of your login credentials. You must not share your account with any other person. Sedative Physio is not liable for any loss or damage arising from unauthorised use of your account.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>3.3 One Account Per User</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Each registration is for a single user only. You may not create multiple accounts or share login access with others.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>3.4 Account Suspension</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We reserve the right to suspend or terminate your account at any time if you are found to be in violation of these Terms, without prior notice or liability.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                4. Paid Courses & Payment
              </h2>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>4.1 Course Access</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Upon successful payment, you will be granted access to the purchased course(s) for the duration specified at the time of purchase. Course access is personal and non-transferable.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>4.2 Pricing</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                All course prices are listed on the Platform and are subject to change at any time. Prices are inclusive of applicable taxes unless stated otherwise.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>4.3 Payment Processing</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Payments are processed through secure third-party payment processors. By making a purchase, you agree to their terms and conditions. Sedative Physio does not store your payment card details.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>4.4 No Refund Policy</p>
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '10px', padding: '16px 20px', marginTop: '8px' }}>
                <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#92400e', margin: 0, fontWeight: 600 }}>
                  ALL SALES ARE FINAL.
                </p>
                <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#92400e', margin: '8px 0 0' }}>
                  Sedative Physio does not offer refunds, exchanges, or credits under any circumstances once a course purchase has been completed. By completing a purchase, you acknowledge and accept this no-refund policy.
                </p>
                <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#92400e', margin: '8px 0 0' }}>
                  If you experience a technical issue preventing access to a purchased course, please contact us at{' '}
                  <a href="mailto:sedativephysio@gmail.com" style={{ color: '#b45309' }}>sedativephysio@gmail.com</a>
                  {' '}and we will resolve the issue promptly.
                </p>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                5. Intellectual Property
              </h2>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>5.1 Ownership</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                All content on the Platform — including but not limited to course videos, lecture notes, 3D models, written materials, graphics, chatbot responses, and the website design — is the exclusive intellectual property of Sedative Physio and Akshay Kumar, protected under applicable copyright and intellectual property laws.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>5.2 Permitted Use</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                You are granted a limited, non-exclusive, non-transferable licence to access and use the course content strictly for your own personal, non-commercial educational purposes.
              </p>
              <p style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b', margin: '16px 0 6px' }}>5.3 Prohibited Use</p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>You must not, under any circumstances:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Download, copy, reproduce, or redistribute course content</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Share course materials, videos, or notes with others</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Upload any Platform content to third-party platforms (YouTube, Telegram, WhatsApp, etc.)</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Use course content for commercial purposes or resale</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Reverse-engineer or extract 3D models or any proprietary assets</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Screen-record or capture video content without explicit written permission</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#dc2626', fontWeight: 600, marginTop: '10px' }}>
                Violation of these terms may result in immediate account termination and legal action.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                6. Third-Party Content & Journals
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                The Platform may provide links to or embed content from third-party academic journals, research papers, and external resources for educational purposes.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Sedative Physio does not own, control, or take responsibility for the accuracy, availability, or legality of third-party content. Access to third-party journals is subject to those providers&apos; own terms and conditions.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Links to external websites do not constitute an endorsement of those sites or their content.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                7. AI Chatbot
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                The Platform includes an AI-powered chatbot to assist with learning queries. The chatbot is provided as an educational aid only and does not constitute medical advice, clinical guidance, or professional physiotherapy consultation.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Do not rely on chatbot responses for clinical decision-making or patient care. Always consult a qualified healthcare professional for medical matters.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Sedative Physio is not liable for any actions taken based on chatbot responses.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                8. Acceptable Use Policy
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>You agree NOT to use the Platform to:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Violate any applicable local, national, or international law or regulation</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Impersonate any person or entity or misrepresent your affiliation</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Transmit any unsolicited or unauthorised advertising or promotional material (spam)</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Introduce viruses, malware, or any harmful code to the Platform</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Attempt to gain unauthorised access to any part of the Platform or its servers</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Harvest or collect user data from the Platform</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Engage in any conduct that restricts or inhibits other users&apos; use of the Platform</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Post or transmit any content that is defamatory, obscene, offensive, or unlawful</li>
              </ul>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569', marginTop: '10px' }}>
                We reserve the right to terminate access for any user found violating this policy.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                9. Free Content & YouTube
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Free content published on YouTube and the Platform is provided for general educational purposes. It does not substitute for formal physiotherapy training or clinical education.
              </p>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                Free content is subject to YouTube&apos;s Terms of Service and Community Guidelines in addition to these Terms.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                10. Disclaimer of Warranties
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                The Platform and all content are provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied. Sedative Physio does not warrant that:
              </p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>The Platform will be uninterrupted or error-free</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>Course content is complete, accurate, or up to date at all times</li>
                <li style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '6px' }}>The Platform is free from viruses or other harmful components</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                11. Limitation of Liability
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                To the fullest extent permitted by law, Sedative Physio and Akshay Kumar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of data, loss of revenue, or inability to access course content.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                12. Changes to These Terms
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated &quot;Last updated&quot; date. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                13. Governing Law
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                These Terms are governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Patna, Bihar, India.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '32px 0 10px', paddingBottom: '8px', borderBottom: '1.5px solid #f1f5f9' }}>
                14. Contact Us
              </h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: '#475569' }}>
                If you have any questions about these Terms of Use, please contact:
              </p>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px 20px', marginTop: '12px' }}>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Name:</strong> Akshay Kumar</p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Platform:</strong> Sedative Physio</p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Email:</strong>{' '}
                  <a href="mailto:sedativephysio@gmail.com" style={{ color: '#3b82f6' }}>sedativephysio@gmail.com</a>
                </p>
                <p style={{ fontSize: '0.925rem', color: '#475569', margin: '4px 0' }}><strong style={{ color: '#1e293b' }}>Website:</strong>{' '}
                  <a href="https://sedativephysio.com" style={{ color: '#3b82f6' }}>https://sedativephysio.com</a>
                </p>
              </div>
            </section>

            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1.5px solid #f1f5f9', textAlign: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Also read our{' '}
                <Link href="/privacy-policy" style={{ color: '#64748b', textDecoration: 'underline' }}>
                  Privacy Policy
                </Link>
              </p>
            </div>

          </div>
        </div>
      </main>
      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .terms-card {
            padding: 24px 20px !important;
          }
        }
      ` }} />
    </div>
  );
}

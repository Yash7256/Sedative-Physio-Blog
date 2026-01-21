import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Paragraph } from "@/components/Paragraph";
import { Highlight } from "@/components/Highlight";
import AIChatExpanded from "@/components/AIChatExpanded";

export const metadata = {
  title: "AI Medical Assistant | Medical Science & Physiotherapy",
  description: "Interact with our AI assistant specialized in medical science and physiotherapy topics.",
};

export default function AIChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <Container>
        <div className="max-w-7xl mx-auto py-6 px-4">
          {/* Compact Header Section */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <Heading className="font-bold text-3xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                AI Medical Assistant
              </Heading>
            </div>
            
            <Paragraph className="text-base text-gray-600 max-w-3xl mx-auto">
              Your specialized companion for <Highlight>medical science</Highlight> and{" "}
              <Highlight>physiotherapy</Highlight> insights. Get evidence-based information 
              on rehabilitation, clinical practices, and research findings.
            </Paragraph>
          </div>

          {/* Compact Info Cards Grid */}
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Evidence-Based</h3>
                  <p className="text-xs text-gray-600">Grounded in medical research</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-4 border border-indigo-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Comprehensive</h3>
                  <p className="text-xs text-gray-600">Covers rehabilitation & more</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-200/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Important Notice</h3>
                  <p className="text-xs text-gray-600">Not a substitute for medical advice</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Disclaimer Banner */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3 mb-4 shadow-sm">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-900 text-xs mb-0.5">Medical Disclaimer</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This AI assistant provides educational information only. Always consult qualified healthcare 
                  professionals for diagnosis, treatment plans, and medical decisions. In case of emergency, 
                  contact your local emergency services immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Full-Height Chat Interface */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden" 
               style={{ height: 'calc(100vh - 380px)', minHeight: '500px' }}>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Medical Assistant</h3>
                    <p className="text-xs text-gray-500">Ready to help with your medical questions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-600">Online</span>
                </div>
              </div>
            </div>

            {/* Chat Component - Full Height */}
            <div className="h-[calc(100%-60px)] overflow-hidden">
              <AIChatExpanded />
            </div>
          </div>

          {/* Compact Sample Questions Section */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 mb-2">Try asking about:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Shoulder rehab",
                "Back pain",
                "Post-surgical recovery",
                "Sports injury",
                "Neurological PT",
              ].map((topic, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
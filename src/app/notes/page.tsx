import { Container } from '@/components/Container';
import { Heading } from '@/components/Heading';
import { Paragraph } from '@/components/Paragraph';
import NotesList from '@/components/NotesList';
import { Highlight } from '@/components/Highlight';

export const metadata = {
  title: 'Resources | Medical Science & Physiotherapy',
  description: 'Access and download resources for medical science and physiotherapy courses.',
};

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
      <Container>
        <div className="max-w-7xl mx-auto py-8 px-4">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <Heading className="font-bold text-4xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Resources
              </Heading>
            </div>
            
            <Paragraph className="text-lg text-gray-600 max-w-3xl mx-auto">
              Access comprehensive <Highlight>educational resources</Highlight> and <Highlight>clinical materials</Highlight> for medical science and physiotherapy. 
              Browse, download, and enhance your learning experience with our curated collection of resources.
            </Paragraph>
          </div>

          {/* Notes List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <Heading className="text-2xl font-semibold text-gray-900">Available Resources</Heading>
              <span className="text-sm text-gray-500">Browse and download resources</span>
            </div>
            <NotesList />
          </div>
        </div>
      </Container>
    </div>
  );
}
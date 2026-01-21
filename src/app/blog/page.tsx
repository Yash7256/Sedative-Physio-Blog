import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import { Blogs } from "@/components/Blogs";
import { Metadata } from "next";
import { headers } from 'next/headers';
import MultiModelAIChatbot from "@/components/MultiModelAIChatbot";

export const metadata: Metadata = {
  title: "Medical Research & Physiotherapy Insights",
  description:
    "Evidence-based research and clinical insights in physiotherapy, rehabilitation medicine, and movement science.",
};

// Sample blog data for demonstration
const sampleBlogs = [
  {
    title: "Evidence-Based Approaches to Musculoskeletal Rehabilitation",
    slug: "evidence-based-musculoskeletal-rehabilitation",
    description: "Exploring current research in manual therapy techniques and their clinical applications for spine and joint disorders.",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2053&q=80",
    tags: ["manual therapy", "research", "clinical practice"],
    date: new Date().toISOString()
  },
  {
    title: "Neuroplasticity and Motor Learning in Stroke Rehabilitation",
    slug: "neuroplasticity-stroke-rehabilitation",
    description: "Understanding brain adaptation mechanisms and their implications for post-stroke recovery protocols.",
    image: "https://images.unsplash.com/photo-1581595219417-2de11f8d8f16?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    tags: ["neuroscience", "stroke rehab", "motor learning"],
    date: new Date(Date.now() - 86400000).toISOString()
  },
  {
    title: "Biomechanical Analysis in Sports Injury Prevention",
    slug: "biomechanics-sports-injury-prevention",
    description: "Using motion analysis and biomechanical principles to develop effective injury prevention strategies for athletes.",
    image: "https://images.unsplash.com/photo-1532530748315-015077b10085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    tags: ["sports medicine", "biomechanics", "injury prevention"],
    date: new Date(Date.now() - 172800000).toISOString()
  }
];

export default async function Blog() {
  // Fetch blogs from Supabase with fallback to sample data
  let blogsToShow = sampleBlogs; // Default to sample data
  let usingSampleData = true;
  
  try {
    // Construct proper URL using headers for server components
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    // For development: show all blogs including drafts
    // For production: uncomment the line below and comment the current apiUrl line
    const apiUrl = `${protocol}://${host}/api/blogs`;
    // const apiUrl = `${protocol}://${host}/api/blogs?published=true`; // Production version
    
    const response = await fetch(apiUrl, {
      cache: 'no-store'
    });
    
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
      // Use real data from Supabase
      blogsToShow = result.data.map((blog: any) => ({
        title: blog.title,
        slug: blog.slug,
        description: blog.description,
        image: blog.cover_image,
        tags: blog.tags,
        date: blog.created_at
      }));
      usingSampleData = false;
    }
  } catch (error) {
    console.error('Error fetching blogs from Supabase:', error);
    // Continue using sample data
  }

  return (
    <Container>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center py-16">
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center mb-6 mx-auto">
            <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          <Heading className="font-black text-4xl md:text-5xl mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Research Publications
          </Heading>
          
          <div className="max-w-2xl mx-auto">
            <Paragraph className="text-xl text-gray-600 mb-2">
              Curating evidence-based insights in <Highlight>physiotherapy</Highlight> and <Highlight>rehabilitation medicine</Highlight>
            </Paragraph>
            
            <div className="inline-flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-6 py-3 mt-6">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 animate-pulse"></div>
              <span className="font-medium text-blue-800">Coming Soon</span>
            </div>
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Clinical Research</h3>
            <p className="text-gray-600 text-sm">Peer-reviewed studies and evidence-based practice guidelines</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Case Studies</h3>
            <p className="text-gray-600 text-sm">Real-world applications and patient outcome analyses</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Expert Insights</h3>
            <p className="text-gray-600 text-sm">Thought leadership and emerging trends in rehabilitation</p>
          </div>
        </div>
      </div>
      
      {/* Multi-Model AI Chatbot component */}
      <MultiModelAIChatbot />
    </Container>
  );
}
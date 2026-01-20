import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Highlight } from "@/components/Highlight";
import { Paragraph } from "@/components/Paragraph";
import { Blogs } from "@/components/Blogs";
import { Metadata } from "next";
import { headers } from 'next/headers';

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
      <span className="text-4xl">🔬</span>
      <Heading className="font-black pb-4">Research & Clinical Insights</Heading>
      <Paragraph className="pb-10">
        Exploring the intersection of <Highlight>medical science</Highlight> and{" "}
        <Highlight>physiotherapy practice</Highlight> to advance patient care
      </Paragraph>
      
      {/* Status indicator */}
      {usingSampleData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-800">
              <strong>Research Preview:</strong> Showing sample medical content. Connect Supabase to see real research publications.
            </p>
          </div>
        </div>
      )}
      
      <Blogs blogs={blogsToShow} />
      
      {/* Setup instructions for Supabase */}
      {usingSampleData && (
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ready to Publish Research?</h3>
          <p className="text-gray-700 mb-4">
            Your medical research platform is ready! To share real clinical insights:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">1. Set up Supabase</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Create free account at supabase.com</li>
                <li>• Create new project for research database</li>
                <li>• Get your API credentials</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">2. Configure Environment</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Update <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                <li>• Run SQL from migration guide</li>
                <li>• Restart development server</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <p className="text-xs text-gray-500">
              All the research publishing tools and clinical content management features are ready to use once connected!
            </p>
          </div>
        </div>
      )}
    </Container>
  );
}
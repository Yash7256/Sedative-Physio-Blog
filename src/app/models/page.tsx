import { Container } from "@/components/Container";
import { Heading } from "@/components/Heading";
import { Paragraph } from "@/components/Paragraph";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "3D Anatomy Models | Medical Visualization",
  description:
    "Interactive 3D anatomical models for physiotherapy education and clinical reference",
};

const models = [
  {
    id: "upper-limb",
    name: "Upper Limb Anatomy",
    description: "Detailed upper extremity model including shoulder, arm, and hand structures",
    category: "upper-limb",
    fileName: "upper-limb.glb",
    thumbnail: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400&h=300&fit=crop"
  },
  {
    id: "hand",
    name: "Hand & Wrist Structures",
    description: "Comprehensive hand model showing bones, joints, and muscle attachments",
    category: "hand",
    fileName: "hand.glb",
    thumbnail: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&h=300&fit=crop"
  },
  {
    id: "lower-limb",
    name: "Lower Limb Anatomy",
    description: "Detailed lower extremity model including hip, leg, and foot structures",
    category: "lower-limb",
    fileName: "lower-limb.glb",
    thumbnail: "https://images.unsplash.com/photo-1576671415309-4a5a2fb7c975?w=400&h=300&fit=crop"
  },
  {
    id: "skull",
    name: "Skull Structures",
    description: "Detailed skull model showing bones, sinuses, and landmarks",
    category: "skeleton",
    fileName: "skull.glb",
    thumbnail: "https://images.unsplash.com/photo-1576671415309-4a5a2fb7c975?w=400&h=300&fit=crop"
  },
  {
    id: "vertebrate",
    name: "Vertebrae Structures",
    description: "Detailed model of individual vertebrae showing bones, joints, and spinal cord",
    category: "skeleton",
    fileName: "vertebrae.glb",
    thumbnail: "https://images.unsplash.com/photo-1576671415309-4a5a2fb7c975?w=400&h=300&fit=crop"
  },
  {
    id: "exploded-skull",
    name: "Exploded Skull",
    description: "Complete skeletal system with major bone structures and landmarks",
    category: "skeleton",
    fileName: "exploded-skull.glb",
    thumbnail: "https://images.unsplash.com/photo-1576671415309-4a5a2fb7c975?w=400&h=300&fit=crop"
  }
];

export default function ModelsPage() {
  return (
    <Container>
      <div className="text-center mb-16">
        <span className="text-4xl">🦴</span>
        <Heading className="font-black text-4xl md:text-5xl lg:text-6xl mt-4">
          3D Anatomy Models
        </Heading>
        <Paragraph className="mt-6 max-w-2xl mx-auto text-lg">
          Interactive medical visualization tools for anatomical study and clinical reference
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {models.map((model) => (
          <Link 
            key={model.id}
            href={`/models/viewer?model=${model.id}`}
            className="group block bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className="aspect-video bg-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-4xl">
                  {model.category === 'skeleton' }
                  {model.category === 'upper-limb' }
                  {model.category === 'hand'}
                </div>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
            </div>
            
            <div className="p-6">
              <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {model.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {model.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {model.category.replace('-', ' ').toUpperCase()}
                </span>
                <span className="text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform inline-flex items-center">
                  View Model
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-3">Clinical Applications</h3>
          <p className="text-gray-600">
            These 3D models serve as educational tools for patient education, treatment planning, 
            and anatomical reference in clinical practice. Perfect for demonstrating movement patterns, 
            injury mechanisms, and rehabilitation exercises.
          </p>
        </div>
      </div>
    </Container>
  );
}
import Link from "next/link";
import { Metadata } from "next";
import { headers } from "next/headers";

const modelData = {
  "upper-limb": {
    name: "Upper Limb Anatomy",
    description: "Detailed upper extremity model including shoulder, arm, and hand structures",
    filePath: "/open3dviewer/3dmodels/upper-limb/upper-limb.glb",
    category: "upper-limb"
  },
  "overview-demo": {
    name: "Skeleton Overview",
    description: "Complete skeletal system with major bone structures and landmarks",
    filePath: "/open3dviewer/3dmodels/overview-demo/overview-demo.glb",
    category: "skeleton"
  }
};

export async function generateMetadata({ searchParams }: { searchParams: { model?: string } }): Promise<Metadata> {
  const modelId = searchParams?.model;
  
  const model = modelId ? {
    "upper-limb": {
      name: "Upper Limb Anatomy",
      description: "Detailed upper extremity model including shoulder, arm, and hand structures"
    },
    "overview-demo": {
      name: "Skeleton Overview",
      description: "Complete skeletal system with major bone structures and landmarks"
    },
    "hand-anatomy": {
      name: "Hand & Wrist Structures",
      description: "Comprehensive hand model showing bones, joints, and muscle attachments"
    }
  }[modelId] : null;
  
  return {
    title: model ? `${model.name} | 3D Anatomy Viewer` : "3D Model Viewer | Medical Visualization",
    description: model ? model.description : "Interactive 3D anatomical model viewer for medical education and clinical reference"
  };
}

export default function ModelViewer({ searchParams }: { searchParams: { model?: string } }) {
  const modelId = searchParams?.model;

  const currentModel = modelId ? modelData[modelId as keyof typeof modelData] : null;

  if (!modelId || !currentModel) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Model Not Found</h1>
            <Link 
              href="/models" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Browse all models
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link 
            href="/models"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Models
          </Link>
          
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentModel.name}
                </h1>
                <p className="text-gray-600">
                  {currentModel.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {currentModel.category.replace('-', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <iframe 
            src={`/open3dviewer/index.html?model=${modelId}`}
            className="w-full h-[700px] border-none"
            title="3D Model Viewer"
            allow="autoplay; fullscreen"
          />
          
          <div className="p-6 border-t border-neutral-200 bg-gray-50">
            <div className="flex flex-wrap gap-4 justify-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                Rotate
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                Zoom In
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                Zoom Out
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Reset View
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Clinical Notes</h3>
          <p className="text-gray-700">
            This 3D model serves as an educational reference for anatomical structures. 
            Use in conjunction with clinical assessment and patient-specific considerations. 
            For commercial use of these models, please ensure proper licensing and attribution.
          </p>
        </div>
      </div>
    </div>
  );
}
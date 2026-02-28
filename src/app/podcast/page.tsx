import { Metadata } from "next";
import { podcasts } from "./data";

export const metadata: Metadata = {
  title: "Podcast | Sedative Physio",
  description: "Listen to expert clinical discussions on physiotherapy, rehabilitation, and sports medicine.",
};

interface Podcast {
  id: number;
  title: string;
  description: string;
  youtubeId: string;
}

export default function PodcastPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-black text-center mb-4">
          Podcast
        </h1>
        <p className="text-gray-600 text-center text-lg mb-12 max-w-2xl mx-auto">
          Listen to expert clinical discussions on physiotherapy, rehabilitation, and sports medicine.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {podcasts.map((podcast: Podcast) => (
            <div
              key={podcast.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${podcast.youtubeId}`}
                  title={podcast.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="p-6 md:p-8">
                <h2 className="text-lg md:text-xl font-bold text-black mb-2">
                  {podcast.title}
                </h2>
                <p className="text-gray-600 text-sm md:text-base">
                  {podcast.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

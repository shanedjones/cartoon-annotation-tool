import Image from "next/image";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 pb-8 gap-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-4 w-full max-w-3xl items-center">
        <h1 className="text-2xl font-bold">Cartoon Annotation Tool</h1>
        
        <div className="w-full max-w-3xl">
          <VideoPlayerWrapper />
        </div>
      </main>
    </div>
  );
}

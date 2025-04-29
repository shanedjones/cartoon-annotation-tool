'use client';

interface SessionControlsProps {
  hasRecordedSession: boolean;
  isRecording: boolean;
  isClient: boolean;
}

export default function SessionControls({ 
  hasRecordedSession, 
  isRecording, 
  isClient 
}: SessionControlsProps) {
  if (!hasRecordedSession) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-2 dark:text-white">Recorded Session</h3>
      <div className="flex space-x-2">
        <button
          onClick={() => document.getElementById('downloadDataButton')?.click()}
          disabled={isClient && (isRecording || !hasRecordedSession)}
          className={isClient && (isRecording || !hasRecordedSession) 
            ? "bg-gray-300 text-gray-500 py-2 px-4 rounded-md" 
            : "bg-blue-500 text-white py-2 px-4 rounded-md"}
        >
          Download Data
        </button>
        <label className="bg-purple-500 text-white py-2 px-4 rounded-md cursor-pointer inline-block">
          Load Data
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement;
              if (fileInput && e.target.files && e.target.files.length > 0) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(e.target.files[0]);
                fileInput.files = dataTransfer.files;
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
              }
            }}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
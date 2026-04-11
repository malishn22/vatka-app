import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on next frame
    const showTimer = requestAnimationFrame(() => setVisible(true));
    // Start fade-out after 2s, then call onDone after transition
    const hideTimer = setTimeout(() => setVisible(false), 2000);
    const doneTimer = setTimeout(() => onDone(), 2500);
    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg bg-green-600 text-white text-sm font-medium transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  );
}

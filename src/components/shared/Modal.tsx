import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

type ModalSize = 'md' | 'lg' | 'xl';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
}

const PRESETS: Record<ModalSize, { width: number; height: number }> = {
  md: { width: 448, height: 360 },
  lg: { width: 672, height: 520 },
  xl: { width: 1100, height: 720 },
};

const MIN_WIDTH = 320;
const MIN_HEIGHT = 240;

function loadSize(size: ModalSize): { width: number; height: number } {
  const preset = PRESETS[size];
  try {
    const raw = localStorage.getItem(`modalSize:${size}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return parsed;
      }
    }
  } catch {}
  return preset;
}

function saveSize(size: ModalSize, dims: { width: number; height: number }) {
  try {
    localStorage.setItem(`modalSize:${size}`, JSON.stringify(dims));
  } catch {}
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const [dims, setDims] = useState(() => loadSize(size));
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDims(loadSize(size));
  }, [isOpen, size]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: dims.width,
      startH: dims.height,
    };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const maxW = window.innerWidth * 0.95;
      const maxH = window.innerHeight * 0.95;
      const width = clamp(d.startW + (ev.clientX - d.startX), MIN_WIDTH, maxW);
      const height = clamp(d.startH + (ev.clientY - d.startY), MIN_HEIGHT, maxH);
      setDims({ width, height });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dragRef.current = null;
      setDims(current => {
        saveSize(size, current);
        return current;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl mx-4 flex flex-col"
        style={{ width: dims.width, height: dims.height, maxWidth: '95vw', maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 px-6 pt-2 pb-6 border-t border-gray-100 dark:border-gray-700">
            {footer}
          </div>
        )}
        <div
          onMouseDown={onResizeMouseDown}
          aria-label="Resize"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          style={{ touchAction: 'none' }}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full" fill="currentColor" aria-hidden="true">
            <circle cx="13" cy="13" r="1" />
            <circle cx="9" cy="13" r="1" />
            <circle cx="13" cy="9" r="1" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  );
}

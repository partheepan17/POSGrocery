import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function KeyboardOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-lg bg-white p-8 shadow-lg">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Keyboard Shortcuts</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-primary-600">Global Shortcuts</h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Toggle Shortcuts</span>
                <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                  F12
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Search Focus</span>
                <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                  Ctrl+F
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-semibold text-primary-600">Sales Shortcuts</h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Add Item</span>
                <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                  F1
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Process Payment</span>
                <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                  F6
                </span>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          Press <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">F12</span> or <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">Esc</span> to close
        </p>
      </div>
    </div>
  );
}










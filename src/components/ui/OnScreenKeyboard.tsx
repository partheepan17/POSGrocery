import React, { useState, useEffect } from 'react';
import { X, Delete, Space, ArrowRight, ArrowUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface OnScreenKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInput?: (text: string) => void;
  targetInput?: HTMLInputElement | null;
}

export function OnScreenKeyboard({ isOpen, onClose, onInput, targetInput }: OnScreenKeyboardProps) {
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  const qwertyLayout = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  const symbolsLayout = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['-', '_', '+', '=', '[', ']', '{', '}', '|', '\\'],
    [';', ':', '"', "'", '<', '>', ',', '.', '?', '/'],
    ['`', '~', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ']
  ];

  const [currentLayout, setCurrentLayout] = useState(qwertyLayout);

  useEffect(() => {
    if (targetInput) {
      setCurrentInput(targetInput.value);
    }
  }, [targetInput]);

  const handleKeyPress = (key: string) => {
    let processedKey = key;
    
    if (isShiftPressed || isCapsLock) {
      processedKey = key.toUpperCase();
    }

    if (targetInput) {
      const start = targetInput.selectionStart || 0;
      const end = targetInput.selectionEnd || 0;
      const newValue = currentInput.slice(0, start) + processedKey + currentInput.slice(end);
      
      setCurrentInput(newValue);
      targetInput.value = newValue;
      targetInput.setSelectionRange(start + 1, start + 1);
      
      // Trigger input event
      const event = new Event('input', { bubbles: true });
      targetInput.dispatchEvent(event);
    } else if (onInput) {
      onInput(processedKey);
    }
  };

  const handleBackspace = () => {
    if (targetInput) {
      const start = targetInput.selectionStart || 0;
      const end = targetInput.selectionEnd || 0;
      
      if (start === end && start > 0) {
        const newValue = currentInput.slice(0, start - 1) + currentInput.slice(end);
        setCurrentInput(newValue);
        targetInput.value = newValue;
        targetInput.setSelectionRange(start - 1, start - 1);
        
        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);
      } else if (start !== end) {
        const newValue = currentInput.slice(0, start) + currentInput.slice(end);
        setCurrentInput(newValue);
        targetInput.value = newValue;
        targetInput.setSelectionRange(start, start);
        
        const event = new Event('input', { bubbles: true });
        targetInput.dispatchEvent(event);
      }
    }
  };

  const handleSpace = () => {
    handleKeyPress(' ');
  };

  const handleEnter = () => {
    if (targetInput) {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      targetInput.dispatchEvent(event);
    }
  };

  const toggleShift = () => {
    setIsShiftPressed(!isShiftPressed);
  };

  const toggleCapsLock = () => {
    setIsCapsLock(!isCapsLock);
    setIsShiftPressed(false);
  };

  const toggleLayout = () => {
    setCurrentLayout(currentLayout === qwertyLayout ? symbolsLayout : qwertyLayout);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-[800px] h-[400px] overflow-hidden shadow-2xl mb-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            On-Screen Keyboard
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Keyboard */}
        <div className="p-4 space-y-2">
          {/* Function Keys */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={toggleShift}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isShiftPressed 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={toggleCapsLock}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isCapsLock 
                  ? "bg-green-600 text-white" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              )}
            >
              CAPS
            </button>
            <button
              onClick={toggleLayout}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {currentLayout === qwertyLayout ? '123' : 'ABC'}
            </button>
          </div>

          {/* Main Keyboard */}
          <div className="space-y-1">
            {currentLayout.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1 justify-center">
                {row.map((key, keyIndex) => (
                  <button
                    key={`${rowIndex}-${keyIndex}`}
                    onClick={() => handleKeyPress(key)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:scale-105 active:scale-95",
                      "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600",
                      key === ' ' && "px-8"
                    )}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom Row */}
          <div className="flex gap-1 justify-center">
            <button
              onClick={handleSpace}
              className="px-16 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-150 hover:scale-105 active:scale-95"
            >
              <Space className="w-4 h-4" />
            </button>
            <button
              onClick={handleBackspace}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-800 transition-all duration-150 hover:scale-105 active:scale-95"
            >
              <Delete className="w-4 h-4" />
            </button>
            <button
              onClick={handleEnter}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-200 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-300 dark:hover:bg-blue-800 transition-all duration-150 hover:scale-105 active:scale-95"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

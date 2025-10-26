import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface WeightInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (weight: number) => void;
  productName: string;
  unitPrice: number;
  unit: string;
  onScaleRead?: () => Promise<number | null>;
}

export function WeightInputModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  productName, 
  unitPrice, 
  unit,
  onScaleRead 
}: WeightInputModalProps) {
  const [weight, setWeight] = useState('');
  const [isScaleReading, setIsScaleReading] = useState(false);
  const [scaleError, setScaleError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setWeight('');
      setScaleError(null);
    }
  }, [isOpen]);

  const handleKeypadInput = (value: string) => {
    if (value === 'clear') {
      setWeight('');
    } else if (value === 'backspace') {
      setWeight(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!weight.includes('.')) {
        setWeight(prev => prev + '.');
      }
    } else if (value === '0') {
      if (weight !== '0') {
        setWeight(prev => prev + '0');
      }
    } else {
      setWeight(prev => prev + value);
    }
  };

  const handleScaleRead = async () => {
    if (!onScaleRead) return;

    setIsScaleReading(true);
    setScaleError(null);

    try {
      const scaleWeight = await onScaleRead();
      if (scaleWeight !== null) {
        setWeight(scaleWeight.toFixed(3));
      } else {
        setScaleError('Scale reading failed');
      }
    } catch (error) {
      setScaleError('Scale connection error');
    } finally {
      setIsScaleReading(false);
    }
  };

  const handleConfirm = () => {
    const weightValue = parseFloat(weight);
    if (isNaN(weightValue) || weightValue <= 0) {
      return;
    }
    onConfirm(weightValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const totalPrice = parseFloat(weight) * unitPrice;
  const isValidWeight = parseFloat(weight) > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Weight Input
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Product Info */}
          <div className="text-center">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {productName}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              රු {unitPrice.toLocaleString()} per {unit}
            </div>
          </div>

          {/* Weight Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Weight ({unit})
            </label>
            <Input
              ref={inputRef}
              type="text"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.000"
              className="text-center text-2xl font-mono"
            />
            {isValidWeight && (
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  Total: රු {totalPrice.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Scale Reading */}
          {onScaleRead && (
            <div className="space-y-2">
              <Button
                onClick={handleScaleRead}
                disabled={isScaleReading}
                className="w-full h-12 text-lg"
                variant="outline"
              >
                {isScaleReading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Reading Scale...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 mr-2" />
                    Read from Scale
                  </>
                )}
              </Button>
              {scaleError && (
                <div className="text-sm text-red-600 dark:text-red-400 text-center">
                  {scaleError}
                </div>
              )}
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {[
              '1', '2', '3',
              '4', '5', '6',
              '7', '8', '9',
              '.', '0', 'backspace'
            ].map((key) => (
              <Button
                key={key}
                onClick={() => handleKeypadInput(key)}
                variant="outline"
                className="h-12 text-lg font-semibold"
                disabled={key === 'backspace' && weight.length === 0}
              >
                {key === 'backspace' ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  key
                )}
              </Button>
            ))}
          </div>

          {/* Clear Button */}
          <Button
            onClick={() => setWeight('')}
            variant="outline"
            className="w-full h-10"
          >
            Clear
          </Button>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidWeight}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <div>• Use keypad or type directly</div>
            <div>• Press Enter to confirm, Esc to cancel</div>
            {onScaleRead && <div>• Use "Read from Scale" for automatic weight</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

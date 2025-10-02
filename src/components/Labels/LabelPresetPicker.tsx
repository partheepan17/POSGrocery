import React, { useState, useEffect } from 'react';
import { ChevronDown, Edit, Plus, Trash2 } from 'lucide-react';
import { LabelPreset } from '@/types';
import { labelService } from '@/services/labelService';
import { cn } from '@/utils/cn';

interface LabelPresetPickerProps {
  selectedPreset: LabelPreset | null;
  onPresetChange: (preset: LabelPreset) => void;
  onEditPreset: (preset: LabelPreset) => void;
  onCreatePreset: () => void;
  className?: string;
}

export function LabelPresetPicker({
  selectedPreset,
  onPresetChange,
  onEditPreset,
  onCreatePreset,
  className
}: LabelPresetPickerProps) {
  const [presets, setPresets] = useState<LabelPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      const presetsData = await labelService.listPresets();
      setPresets(presetsData);
      
      // Auto-select first preset if none selected
      if (!selectedPreset && presetsData.length > 0) {
        onPresetChange(presetsData[0]);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async (preset: LabelPreset, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (presets.length <= 1) {
      alert('Cannot delete the last preset');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
      try {
        await labelService.deletePreset(preset.id);
        await loadPresets();
        
        // Select another preset if the deleted one was selected
        if (selectedPreset?.id === preset.id) {
          const remainingPresets = presets.filter(p => p.id !== preset.id);
          if (remainingPresets.length > 0) {
            onPresetChange(remainingPresets[0]);
          }
        }
      } catch (error) {
        console.error('Failed to delete preset:', error);
        alert('Failed to delete preset');
      }
    }
  };

  const handleEditPreset = (preset: LabelPreset, event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen(false);
    onEditPreset(preset);
  };

  if (loading) {
    return (
      <div className={cn("w-64", className)}>
        <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Selected Preset Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          {selectedPreset ? (
            <div>
              <div className="font-medium text-gray-900">{selectedPreset.name}</div>
              <div className="text-sm text-gray-500">
                {selectedPreset.size.width_mm}×{selectedPreset.size.height_mm}mm • {selectedPreset.paper}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">Select a preset...</span>
          )}
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-gray-400 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Create New Preset Option */}
          <button
            onClick={() => {
              setIsOpen(false);
              onCreatePreset();
            }}
            className="w-full flex items-center px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100"
          >
            <Plus className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-blue-600 font-medium">Create New Preset</span>
          </button>

          {/* Preset List */}
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                "flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer",
                selectedPreset?.id === preset.id && "bg-blue-50"
              )}
              onClick={() => {
                onPresetChange(preset);
                setIsOpen(false);
              }}
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">{preset.name}</div>
                <div className="text-sm text-gray-500">
                  {preset.size.width_mm}×{preset.size.height_mm}mm • {preset.paper}
                  {preset.paper === 'A4' && preset.a4 && (
                    <span> • {preset.a4.rows}×{preset.a4.cols} grid</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {preset.barcode.symbology} • {preset.fields.price.source} price
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => handleEditPreset(preset, e)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit preset"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {presets.length > 1 && (
                  <button
                    onClick={(e) => handleDeletePreset(preset, e)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {presets.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500">
              No presets available. Create one to get started.
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

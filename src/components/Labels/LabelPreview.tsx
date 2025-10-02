import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Eye } from 'lucide-react';
import { LabelBatch, LabelPreset, LabelItem } from '@/types';
import { labelPrintAdapter, RenderedLabel, RenderedPage } from '@/services/print/LabelPrintAdapter';
import { cn } from '@/utils/cn';

interface LabelPreviewProps {
  batch: LabelBatch;
  className?: string;
}

export function LabelPreview({ batch, className }: LabelPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [showBorders, setShowBorders] = useState(false);
  const [renderedContent, setRenderedContent] = useState<{
    thermal: RenderedLabel[];
    a4: RenderedPage[];
  }>({ thermal: [], a4: [] });

  useEffect(() => {
    generatePreview();
  }, [batch]);

  const generatePreview = async () => {
    if (!batch.preset || !batch.items || batch.items.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const options = { 
        dpi: 203 as const, 
        scale: 1.0, 
        showBorders 
      };

      let thermal: RenderedLabel[] = [];
      let a4: RenderedPage[] = [];

      if (batch.preset.paper === 'THERMAL') {
        thermal = await labelPrintAdapter.renderThermal(batch, options);
      } else if (batch.preset.paper === 'A4') {
        a4 = await labelPrintAdapter.renderA4(batch, options);
      }

      setRenderedContent({ thermal, a4 });
      setCurrentPage(0);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
  };

  const toggleBorders = async () => {
    setShowBorders(!showBorders);
    // Regenerate preview with new border setting
    await generatePreview();
  };

  const totalPages = batch.preset.paper === 'A4' 
    ? renderedContent.a4.length 
    : Math.ceil(renderedContent.thermal.length / 6); // Show 6 thermal labels per "page"

  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  const totalLabels = batch.items.reduce((sum, item) => sum + item.qty, 0);

  if (loading) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generating preview...</span>
        </div>
      </div>
    );
  }

  if (!batch.preset || !batch.items || batch.items.length === 0) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <Eye className="w-8 h-8 mr-2" />
          <span>No labels to preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Preview - {batch.preset.name}
          </h3>
          <div className="text-sm text-gray-500">
            {totalLabels} label{totalLabels !== 1 ? 's' : ''} ({batch.items.length} unique)
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Borders Toggle */}
          <button
            onClick={toggleBorders}
            className={cn(
              "px-3 py-1.5 text-sm border rounded-md transition-colors",
              showBorders
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            Borders
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-gray-50 transition-colors"
              disabled={zoom <= 0.25}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <div className="px-3 py-1.5 text-sm font-medium border-x border-gray-300 min-w-[4rem] text-center">
              {Math.round(zoom * 100)}%
            </div>
            
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-gray-50 transition-colors"
              disabled={zoom >= 3.0}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleResetZoom}
            className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-4">
        {batch.preset.paper === 'A4' ? (
          <A4Preview 
            pages={renderedContent.a4}
            currentPage={currentPage}
            zoom={zoom}
          />
        ) : (
          <ThermalPreview 
            labels={renderedContent.thermal}
            currentPage={currentPage}
            zoom={zoom}
            labelsPerPage={6}
          />
        )}
      </div>

      {/* Footer Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
            disabled={!canGoPrevious}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Page {currentPage + 1} of {totalPages}
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))}
            disabled={!canGoNext}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}

interface A4PreviewProps {
  pages: RenderedPage[];
  currentPage: number;
  zoom: number;
}

function A4Preview({ pages, currentPage, zoom }: A4PreviewProps) {
  const currentPageData = pages[currentPage];
  
  if (!currentPageData) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No content to display
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div 
        style={{ transform: `scale(${zoom})` }}
        className="transform-gpu origin-top"
      >
        <div 
          dangerouslySetInnerHTML={{ __html: currentPageData.html }}
          className="shadow-lg"
        />
      </div>
    </div>
  );
}

interface ThermalPreviewProps {
  labels: RenderedLabel[];
  currentPage: number;
  zoom: number;
  labelsPerPage: number;
}

function ThermalPreview({ labels, currentPage, zoom, labelsPerPage }: ThermalPreviewProps) {
  const startIndex = currentPage * labelsPerPage;
  const endIndex = Math.min(startIndex + labelsPerPage, labels.length);
  const pageLabels = labels.slice(startIndex, endIndex);

  if (pageLabels.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        No labels to display
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div 
        style={{ transform: `scale(${zoom})` }}
        className="transform-gpu origin-top"
      >
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-100 rounded-lg">
          {pageLabels.map((label, index) => (
            <div
              key={startIndex + index}
              dangerouslySetInnerHTML={{ __html: label.html }}
              className="shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

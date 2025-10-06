import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Eye, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { LabelBatch, LabelPreset, LabelItem } from '@/types';
import { labelPrintAdapter, RenderedLabel, RenderedPage } from '@/services/print/LabelPrintAdapter';
import { validateLabelItemDates } from '@/services/labelService';
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

  // Validation warnings for the batch
  const validationWarnings = useMemo(() => {
    if (!batch.items || !batch.preset) return [];
    
    const warnings: Array<{ type: 'date' | 'mrp' | 'format'; message: string; count: number }> = [];
    
    let dateErrors = 0;
    let missingMrp = 0;
    
    // Check each item for validation issues
    batch.items.forEach(item => {
      // Date validation
      if (item.packedDate || item.expiryDate) {
        const dateFormat = batch.preset?.fields.dateFormat || 'YYYY-MM-DD';
        const validation = validateLabelItemDates(item, dateFormat);
        if (!validation.valid) {
          dateErrors++;
        }
      }
      
      // MRP validation - only warn if preset shows MRP but item has no MRP
      if (batch.preset?.fields.showMRP && (item.mrp === null || item.mrp === undefined)) {
        missingMrp++;
      }
    });
    
    if (dateErrors > 0) {
      warnings.push({
        type: 'date',
        message: `${dateErrors} item(s) have invalid date relationships (expiry before packed date)`,
        count: dateErrors
      });
    }
    
    if (missingMrp > 0) {
      warnings.push({
        type: 'mrp',
        message: `${missingMrp} item(s) missing MRP while template shows MRP field`,
        count: missingMrp
      });
    }
    
    return warnings;
  }, [batch.items, batch.preset]);

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
      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="p-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-1">Validation Warnings</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    {warning.type === 'date' && <Calendar className="w-4 h-4" />}
                    {warning.type === 'mrp' && <DollarSign className="w-4 h-4" />}
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 mt-2">
                These issues won't prevent printing but may affect label quality. Review items in the batch editor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Preview - {batch.preset.name}
          </h3>
          <div className="text-sm text-gray-500">
            {totalLabels} label{totalLabels !== 1 ? 's' : ''} ({batch.items.length} unique)
          </div>
          {validationWarnings.length > 0 && (
            <div className="flex items-center text-amber-600">
              <AlertTriangle className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{validationWarnings.length} warning{validationWarnings.length !== 1 ? 's' : ''}</span>
            </div>
          )}
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

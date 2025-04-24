'use client';

import React, { useState, useEffect } from 'react';

interface FocusArea {
  id: string;
  content: string;
  order: number;
}

// Interface for future use
// interface AssessmentReview {
//   notes: string;
//   focusAreas: FocusArea[];
// }

interface AssessmentReviewModalProps {
  sessionId: string;
  athleteName: string;
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
}

const DEFAULT_FOCUS_AREAS: FocusArea[] = [
  { id: 'area-a', content: 'Focus Area A', order: 0 },
  { id: 'area-b', content: 'Focus Area B', order: 1 },
  { id: 'area-c', content: 'Focus Area C', order: 2 },
  { id: 'area-d', content: 'Focus Area D', order: 3 },
  { id: 'area-e', content: 'Focus Area E', order: 4 },
  { id: 'area-f', content: 'Focus Area F', order: 5 },
  { id: 'area-g', content: 'Focus Area G', order: 6 },
];

export default function AssessmentReviewModal({ sessionId, athleteName, isOpen, onClose }: AssessmentReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([...DEFAULT_FOCUS_AREAS]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingReview, setLoadingReview] = useState(true);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Load existing review data if available
  useEffect(() => {
    if (isOpen && sessionId) {
      const fetchReview = async () => {
        try {
          setLoadingReview(true);
          const response = await fetch(`/api/assessments/review?sessionId=${sessionId}`);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data && data.notes) {
              setNotes(data.notes);
              
              // If we have saved focus areas, use those, otherwise use defaults
              if (data.focusAreas && Array.isArray(data.focusAreas) && data.focusAreas.length > 0) {
                // Sort by order
                const sortedAreas = [...data.focusAreas].sort((a, b) => a.order - b.order);
                setFocusAreas(sortedAreas);
              } else {
                setFocusAreas([...DEFAULT_FOCUS_AREAS]);
              }
            } else {
              // No existing review, use defaults
              setNotes('');
              setFocusAreas([...DEFAULT_FOCUS_AREAS]);
            }
          } else {
            // If 404, it's a new review
            setNotes('');
            setFocusAreas([...DEFAULT_FOCUS_AREAS]);
          }
        } catch (error) {
          console.error('Error fetching assessment review:', error);
          // Use defaults on error
          setNotes('');
          setFocusAreas([...DEFAULT_FOCUS_AREAS]);
        } finally {
          setLoadingReview(false);
        }
      };
      
      fetchReview();
    }
  }, [isOpen, sessionId]);

  const handleSave = async () => {
    if (!sessionId) return;
    
    try {
      setIsSaving(true);
      setSaveError('');
      
      // Prepare review data
      const reviewData = {
        notes,
        focusAreas: focusAreas.map((area, index) => ({
          ...area,
          order: index // Update order based on current position
        }))
      };
      
      // Save to API
      const response = await fetch('/api/assessments/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          review: reviewData
        }),
      });
      
      if (response.ok) {
        // Close modal and indicate success to parent
        onClose(true);
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to save assessment review');
      }
    } catch (error) {
      console.error('Error saving assessment review:', error);
      setSaveError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null) return;
    
    if (draggedItem !== index) {
      const newFocusAreas = [...focusAreas];
      const draggedItemContent = newFocusAreas[draggedItem];
      
      // Remove the dragged item
      newFocusAreas.splice(draggedItem, 1);
      // Insert it at the new position
      newFocusAreas.splice(index, 0, draggedItemContent);
      
      // Update state and dragged item index
      setFocusAreas(newFocusAreas);
      setDraggedItem(index);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Move focus area up
  const moveFocusAreaUp = (index: number) => {
    if (index === 0) return; // Already at the top
    
    const newFocusAreas = [...focusAreas];
    const temp = newFocusAreas[index];
    newFocusAreas[index] = newFocusAreas[index - 1];
    newFocusAreas[index - 1] = temp;
    
    setFocusAreas(newFocusAreas);
  };
  
  // Move focus area down
  const moveFocusAreaDown = (index: number) => {
    if (index === focusAreas.length - 1) return; // Already at the bottom
    
    const newFocusAreas = [...focusAreas];
    const temp = newFocusAreas[index];
    newFocusAreas[index] = newFocusAreas[index + 1];
    newFocusAreas[index + 1] = temp;
    
    setFocusAreas(newFocusAreas);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Assessment Review: {athleteName}</h2>
        </div>
        
        {loadingReview ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mb-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Notes
              </label>
              <textarea
                id="notes"
                rows={5}
                className="w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter assessment notes here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div>
              <h3 className="block text-sm font-medium text-gray-700 mb-3">
                Focus Areas (Reorder by priority - highest priority first)
              </h3>
              
              <ul className="space-y-2">
                {focusAreas.map((area, index) => (
                  <li
                    key={area.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-gray-50 border ${draggedItem === index ? 'border-indigo-500' : 'border-gray-200'} rounded-md p-3 flex items-center cursor-move`}
                  >
                    <span className="w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-full text-indigo-800 font-semibold mr-3">
                      {index + 1}
                    </span>
                    <span className="flex-1">{area.content}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => moveFocusAreaUp(index)}
                        disabled={index === 0}
                        className={`p-1 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveFocusAreaDown(index)}
                        disabled={index === focusAreas.length - 1}
                        className={`p-1 rounded hover:bg-gray-200 ${index === focusAreas.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            {saveError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {saveError}
              </div>
            )}
          </div>
        )}
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={() => onClose()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loadingReview}
            className={`px-4 py-2 rounded-md ${
              isSaving || loadingReview
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
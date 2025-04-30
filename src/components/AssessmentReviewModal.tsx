'use client';
import React, { useState, useEffect, useCallback } from 'react';
interface AssessmentReview {
  notes: string;
}
interface AssessmentReviewModalProps {
  sessionId: string;
  athleteName: string;
  isOpen: boolean;
  onClose: (saved?: boolean) => void;
}
function AssessmentReviewModal({ sessionId, athleteName, isOpen, onClose }: AssessmentReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingReview, setLoadingReview] = useState(true);
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
            } else {
              setNotes('');
            }
          } else {
            setNotes('');
          }
        } catch (error) {
          setNotes('');
        } finally {
          setLoadingReview(false);
        }
      };
      fetchReview();
    }
  }, [isOpen, sessionId]);
  const handleSave = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsSaving(true);
      setSaveError('');
      const reviewData = {
        notes
      };
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
        onClose(true);
      } else {
        const errorData = await response.json();
        setSaveError(errorData.error || 'Failed to save assessment review');
      }
    } catch (error) {
      setSaveError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, notes, onClose]);
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
            {saveError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                {saveError}
              </div>
            )}
          </div>
        )}
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={(e) => onClose()}
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

export default React.memo(AssessmentReviewModal);
'use client';
import { useMemo } from 'react';

interface DataLabelingProperty {
  id: string;
  label: string;
}

interface CategoryPanelProps {
  dataLabelingTitle: string;
  labelProperties: DataLabelingProperty[];
  categories: Record<string, number | null>;
  isRecording: boolean;
  isCompletedVideo: boolean;
  isReplayMode: boolean;
  categoryList: {id?: string, name: string, rating: number}[];
  handleCategoryChange: (category: string, rating: number) => void;
}

export default function CategoryPanel({
  dataLabelingTitle,
  labelProperties,
  categories,
  isRecording,
  isCompletedVideo,
  isReplayMode,
  categoryList,
  handleCategoryChange
}: CategoryPanelProps) {
  
  const renderCategoryRating = (propertyId: string, propertyLabel: string) => {
    const ratingCategoryById = categoryList.find(cat => 
      cat.id && cat.id === propertyId
    );
    const ratingCategoryByName = !ratingCategoryById ? categoryList.find(cat =>
      cat.name?.toLowerCase() === propertyLabel.toLowerCase() ||
      cat.name?.toLowerCase().replace(/\s+/g, '') === propertyLabel.toLowerCase().replace(/\s+/g, '')
    ) : null;
    const directRating = categories[propertyId];
    const rating = directRating ||
                  ratingCategoryById?.rating ||
                  ratingCategoryByName?.rating ||
                  0;
    
    switch(rating) {
      case 1:
        return <div className="w-8 h-8 rounded-full !bg-red-500 !border-2 !border-red-500" title="Red rating" />;
      case 2:
        return <div className="w-8 h-8 rounded-full !bg-yellow-300 !border-2 !border-yellow-400" title="Yellow rating" />;
      case 3:
        return <div className="w-8 h-8 rounded-full !bg-green-500 !border-2 !border-green-500" title="Green rating" />;
      default:
        return <div className="w-8 h-8 rounded-full !bg-white !border-2 !border-gray-300 dark:!border-gray-500" title="No rating" />;
    }
  };

  const renderInteractiveCategories = () => (
    <div className="space-y-3">
      {labelProperties?.map((property) => (
        <div key={property.id}>
          <div className="mb-1 dark:text-white">{property.label}</div>
          <div className="flex items-center space-x-2">
            {}
            <button
              type="button"
              onClick={() => handleCategoryChange(property.id, 1)}
              className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 1 ? "!bg-red-500 !border-red-500" : "!bg-white !border-red-500 hover:!bg-red-100"}`}
              aria-label="Red rating"
            />
            <button
              type="button"
              onClick={() => handleCategoryChange(property.id, 2)}
              className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 2 ? "!bg-yellow-300 !border-yellow-400" : "!bg-white !border-yellow-400 hover:!bg-yellow-100"}`}
              aria-label="Yellow rating"
            />
            <button
              type="button"
              onClick={() => handleCategoryChange(property.id, 3)}
              className={`w-8 h-8 rounded-full !outline-none !border-2 ${(categories[property.id] ?? 0) === 3 ? "!bg-green-500 !border-green-500" : "!bg-white !border-green-500 hover:!bg-green-100"}`}
              aria-label="Green rating"
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderViewOnlyCategories = () => (
    <div>
      <ul className="space-y-3">
        {labelProperties?.map((property) => (
          <li key={property.id}>
            <div className="font-medium dark:text-white">{property.label}</div>
            <div className="flex mt-1 space-x-2">
              {renderCategoryRating(property.id, property.label)}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {categoryList.length > 0 ? `${categoryList.length} ${categoryList.length === 1 ? 'category' : 'categories'} rated` : 'No ratings yet'}
      </p>
    </div>
  );

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 h-full">
      <h2 className="text-xl font-semibold mb-3 dark:text-white">{dataLabelingTitle}</h2>
      {}
      {!isRecording && isCompletedVideo || isReplayMode ? renderViewOnlyCategories() : renderInteractiveCategories()}
    </div>
  );
}
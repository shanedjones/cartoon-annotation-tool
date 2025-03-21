"use client"

import Image from "next/image";
import VideoPlayerWrapper from "../src/components/VideoPlayerWrapper";
import { useState, useCallback } from "react";

export default function Home() {
  // State for checkboxes during recording
  const [categories, setCategories] = useState({
    artisticStyle: false,
    characterDesign: false,
    backgroundSettings: false,
    motionDynamics: false,
    colorPalette: false,
    soundEffects: false,
    visualEffects: false,
    narrativeTechniques: false,
    perspectiveView: false,
    lightingShadows: false,
  });
  
  // State to track if we're in replay mode
  const [isReplayMode, setIsReplayMode] = useState(false);
  
  // State for category list that will be shown during replay
  const [categoryList, setCategoryList] = useState<string[]>([]);
  
  // Define window type with our custom property
  declare global {
    interface Window {
      __videoPlayerWrapper?: {
        recordCategoryChange: (category: string, checked: boolean) => void;
        isRecording: boolean;
      };
    }
  }
  
  // Get formatted category label
  const getCategoryLabel = (category: string) => {
    return category.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase());
  };
  
  const handleCategoryChange = (category: string) => {
    const newValue = !categories[category as keyof typeof categories];
    console.log(`RECORDING: Changing category ${category} to ${newValue}`);
    
    const newCategories = {
      ...categories,
      [category]: newValue,
    };
    
    console.log('RECORDING: New categories state:', newCategories);
    setCategories(newCategories);
    
    // Record the category change event in the orchestrator if we're recording
    if (typeof window !== 'undefined' && window.__videoPlayerWrapper?.isRecording) {
      console.log(`RECORDING: Sending category event to orchestrator: ${category}=${newValue}`);
      
      try {
        window.__videoPlayerWrapper.recordCategoryChange(category, newValue);
        console.log('RECORDING: Category event sent successfully');
      } catch (error) {
        console.error('RECORDING: Error sending category event:', error);
      }
    } else {
      console.warn('RECORDING: Not recording category event - isRecording is false or wrapper not available');
      console.log('RECORDING: window.__videoPlayerWrapper?.isRecording =', 
        typeof window !== 'undefined' ? window.__videoPlayerWrapper?.isRecording : 'window undefined');
    }
  };
  
  // Function to clear all categories (called when recording stops)
  const clearCategories = useCallback(() => {
    setCategories({
      artisticStyle: false,
      characterDesign: false,
      backgroundSettings: false,
      motionDynamics: false,
      colorPalette: false,
      soundEffects: false,
      visualEffects: false,
      narrativeTechniques: false,
      perspectiveView: false,
      lightingShadows: false,
    });
    
    // Also clear the category list for replay mode
    setCategoryList([]);
  }, []);
  
  // Function to handle categories during replay
  const handleCategoryAddedDuringReplay = useCallback((categoryChanges: Record<string, boolean>) => {
    console.log('PARENT: Received categories for replay:', categoryChanges);
    
    // Debug log all entries
    Object.entries(categoryChanges).forEach(([key, value]) => {
      console.log(`PARENT: Category ${key} = ${value}`);
    });
    
    // Convert all checked categories to formatted labels
    const checkedCategories = Object.entries(categoryChanges)
      .filter(([_, isChecked]) => isChecked)
      .map(([categoryName, _]) => {
        const label = getCategoryLabel(categoryName);
        console.log(`PARENT: Formatting category ${categoryName} to ${label}`);
        return label;
      });
    
    if (checkedCategories.length > 0) {
      console.log(`PARENT: Adding ${checkedCategories.length} categories to replay list:`, checkedCategories);
      
      // Force state update with a deep copy and force render with a callback
      const newList = [...checkedCategories];
      console.log('PARENT: Setting category list to:', newList);
      
      // Ensure we're in replay mode
      setIsReplayMode(true);
      
      // Replace the entire list at once with a forced update
      setCategoryList(newList);
      
      // Force UI update by using double setState in different ticks for React 18+ batching
      setTimeout(() => {
        setCategoryList(prevList => {
          console.log('PARENT: Forced update, category list is now:', prevList);
          return prevList; // Return same array but force an update
        });
        
        // Double-check in the next tick
        setTimeout(() => {
          console.log('PARENT: After update, category list should be:', newList);
        }, 100);
      }, 50);
    } else {
      console.log('PARENT: No checked categories found');
      setCategoryList([]);
    }
  }, []);
  
  // Function to handle replay mode change
  const handleReplayModeChange = useCallback((isReplay: boolean) => {
    console.log(`Setting replay mode to: ${isReplay}`);
    setIsReplayMode(isReplay);
    
    // Clear the category list when entering/exiting replay mode
    if (isReplay) {
      setCategoryList([]);
    }
  }, []);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-4 pb-8 gap-4 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-4 w-full max-w-4xl items-center">
        <h1 className="text-2xl font-bold">Cartoon Annotation Tool</h1>
        
        <div className="flex flex-col sm:flex-row w-full gap-4">
          <div className="w-full sm:w-1/3 p-4 border rounded-lg bg-gray-50">
            <h2 className="text-xl font-semibold mb-3">Animation Categories</h2>
            
            {/* Show checkboxes during recording mode */}
            {!isReplayMode ? (
              <div className="space-y-2">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="artisticStyle" 
                    checked={categories.artisticStyle}
                    onChange={() => handleCategoryChange("artisticStyle")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="artisticStyle">Artistic Style</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="characterDesign" 
                    checked={categories.characterDesign}
                    onChange={() => handleCategoryChange("characterDesign")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="characterDesign">Character Design</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="backgroundSettings" 
                    checked={categories.backgroundSettings}
                    onChange={() => handleCategoryChange("backgroundSettings")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="backgroundSettings">Background Settings</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="motionDynamics" 
                    checked={categories.motionDynamics}
                    onChange={() => handleCategoryChange("motionDynamics")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="motionDynamics">Motion Dynamics</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="colorPalette" 
                    checked={categories.colorPalette}
                    onChange={() => handleCategoryChange("colorPalette")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="colorPalette">Color Palette</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="soundEffects" 
                    checked={categories.soundEffects}
                    onChange={() => handleCategoryChange("soundEffects")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="soundEffects">Sound Effects</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="visualEffects" 
                    checked={categories.visualEffects}
                    onChange={() => handleCategoryChange("visualEffects")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="visualEffects">Visual Effects</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="narrativeTechniques" 
                    checked={categories.narrativeTechniques}
                    onChange={() => handleCategoryChange("narrativeTechniques")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="narrativeTechniques">Narrative Techniques</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="perspectiveView" 
                    checked={categories.perspectiveView}
                    onChange={() => handleCategoryChange("perspectiveView")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="perspectiveView">Perspective View</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="lightingShadows" 
                    checked={categories.lightingShadows}
                    onChange={() => handleCategoryChange("lightingShadows")}
                    className="h-4 w-4 mr-2"
                  />
                  <label htmlFor="lightingShadows">Lighting & Shadows</label>
                </div>
              </div>
            ) : (
              // Show a simple list during replay mode
              <div className="replay-categories">
                {categoryList.length === 0 ? (
                  <p className="text-gray-500 italic">Categories will appear here when session loads.</p>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-2">Selected animation categories:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {categoryList.map((category, index) => (
                        <li key={index} className="text-green-600 font-medium">
                          {category}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-gray-500 mt-2">{categoryList.length} categories selected</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="w-full sm:w-2/3">
            <VideoPlayerWrapper 
              categories={categories}
              onCategoriesCleared={clearCategories}
              onCategoriesLoaded={handleCategoryAddedDuringReplay}
              onReplayModeChange={handleReplayModeChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

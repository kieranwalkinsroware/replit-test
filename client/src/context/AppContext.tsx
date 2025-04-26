import React, { createContext, useState, useContext } from 'react';
import { AppStep, Video } from '../types';

interface AppContextType {
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
  videoData: string | null;
  setVideoData: (data: string | null) => void;
  generatedVideo: Video | null;
  setGeneratedVideo: (video: Video | null) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  navigationHistory: AppStep[];
  goBack: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<AppStep>('intro');
  const [videoData, setVideoData] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<Video | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [navigationHistory, setNavigationHistory] = useState<AppStep[]>(['intro']);

  const handleSetCurrentStep = (step: AppStep) => {
    setNavigationHistory(prev => [...prev, step]);
    setCurrentStep(step);
  };

  const goBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current step
      const previousStep = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentStep(previousStep);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentStep,
        setCurrentStep: handleSetCurrentStep,
        videoData,
        setVideoData,
        generatedVideo,
        setGeneratedVideo,
        prompt,
        setPrompt,
        isProcessing,
        setIsProcessing,
        navigationHistory,
        goBack,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

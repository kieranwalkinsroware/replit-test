import React from 'react';
import { Route, Switch } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import IntroductionPage from './pages/IntroductionPage';
import TrainingPage from './pages/TrainingPage';
import CameraPage from './pages/CameraPage';
import TrainingConfirmationPage from './pages/TrainingConfirmationPage';
import InteractionPage from './pages/InteractionPage';
import VideoResultPage from './pages/VideoResultPage';
import NotFoundPage from './pages/not-found';

// Import material icons
const MaterialIcons = () => (
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
);

function AppContent() {
  // Detect if we're on iOS for special handling
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <MaterialIcons />
      {isIOS && (
        <div className="bg-amber-100 text-amber-900 p-2 text-center text-xs fixed top-0 left-0 right-0 z-50">
          <p>iPhone detected. Video experience optimized for iOS.</p>
        </div>
      )}
      <Switch>
        <Route path="/" component={IntroductionPage} />
        <Route path="/training" component={TrainingPage} />
        <Route path="/camera" component={CameraPage} />
        <Route path="/training-confirmation/:uploadId" component={TrainingConfirmationPage} />
        <Route path="/interact" component={InteractionPage} />
        <Route path="/video/:videoId" component={VideoResultPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

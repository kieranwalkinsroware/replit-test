import React from 'react';
import { useLocation } from 'wouter';
import Layout from '../components/Layout';
import CustomButton from '../components/CustomButton';
import aiGameImage from '@assets/ai-game1.png';

const IntroductionPage: React.FC = () => {
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    setLocation('/training');
  };

  const handleDemoVideos = () => {
    setLocation('/interact');
  };

  return (
    <Layout showBackButton={false}>
      <h1 className="text-3xl font-bold mt-8 mb-4">AI Game Introduction</h1>
      
      <div className="rounded-lg overflow-hidden mb-6">
        <img 
          src={aiGameImage}
          alt="Astronaut AI Character" 
          className="w-full h-64 object-cover"
        />
      </div>
      
      <h2 className="text-xl font-bold mt-6 mb-2">What are AI Games</h2>
      <p className="mb-4">
        VOTA AI can automatically place you in various settings by creating a digital persona of your likeness. 
        Automate engagements with your fanbase through the power of AI.
      </p>
      
      <CustomButton 
        secondary
        onClick={handleDemoVideos}
        className="mb-6"
      >
        See some demo videos
      </CustomButton>
      
      <div className="bg-gray-800 rounded-lg p-4 mb-8">
        <h3 className="font-bold mb-3">How it works:</h3>
        <ol className="space-y-3">
          <li className="flex items-start">
            <span className="mr-2 font-bold">1.</span>
            <span>Train AI - Upload 15-20 images of your face and body.</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">2.</span>
            <span>Voiceover - Read out the text on screen.</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">3.</span>
            <span>Sit back and let AI do the work!</span>
          </li>
        </ol>
      </div>
      
      <CustomButton onClick={handleContinue}>
        CONTINUE
      </CustomButton>
    </Layout>
  );
};

export default IntroductionPage;

import React from 'react';
import { useLocation } from 'wouter';
import Layout from '../components/Layout';
import CustomButton from '../components/CustomButton';
import topOfPageImage from '@assets/top-of-page.png';
import faceCoveringImage from '@assets/face-covering.png';
import dimLightImage from '@assets/dim-light.png';
import videoBlurImage from '@assets/video-blur.png';
import faceSmallImage from '@assets/face-small.png';

const TrainingPage: React.FC = () => {
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    setLocation('/camera');
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mt-8 mb-4">Train AI</h1>
      
      <p className="mb-4">
        Have your chance to be in a cinematic quality movie series with your fans. 
        Engage with thousands of fans via your own digital avatar.
      </p>
      
      <p className="mb-2">Let's get started! You will need to do some training.</p>
      
      <h2 className="text-xl font-bold mt-6 mb-3">Requirements for the Video</h2>
      
      <div className="rounded-lg overflow-hidden mb-4">
        <img 
          src={topOfPageImage} 
          alt="Perfect portrait example" 
          className="w-full h-40 object-cover"
        />
      </div>
      
      <p className="text-sm mb-6">Only 1 person, front camera view, 1/4 frame and a natural expression.</p>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="aspect-video bg-gray-700 rounded mb-2 overflow-hidden">
            <img 
              src={faceCoveringImage} 
              alt="Face covering example" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-1">cancel</span>
            <p className="text-sm">Face covering</p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="aspect-video bg-gray-700 rounded mb-2 overflow-hidden">
            <img 
              src={dimLightImage} 
              alt="Dim lighting example" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-1">cancel</span>
            <p className="text-sm">Dim lighting</p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="aspect-video bg-gray-700 rounded mb-2 overflow-hidden">
            <img 
              src={videoBlurImage}
              alt="Video blur example" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-1">cancel</span>
            <p className="text-sm">Video blur</p>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-2">
          <div className="aspect-video bg-gray-700 rounded mb-2 overflow-hidden">
            <img 
              src={faceSmallImage} 
              alt="Face too small example" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center">
            <span className="material-icons text-red-500 mr-1">cancel</span>
            <p className="text-sm">Face too small</p>
          </div>
        </div>
      </div>
      
      <CustomButton onClick={handleContinue}>
        CONTINUE
      </CustomButton>
    </Layout>
  );
};

export default TrainingPage;

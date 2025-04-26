import React, { useRef, useState, useEffect } from 'react';
import { useCamera } from '../hooks/useCamera';
import { RECORDING_TIME } from '../constants';

interface CameraViewProps {
  onRecordingComplete: (videoData: string) => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onRecordingComplete }) => {
  const { 
    videoRef, 
    startRecording,
    stopRecording,
    hasCamera,
    cameraLoading,
    isRecording,
    recordingTime,
    faceDetected,
    startCamera
  } = useCamera({ maxRecordingTime: RECORDING_TIME });

  useEffect(() => {
    // Start camera when component mounts
    startCamera();
  }, [startCamera]);

  const handleStartRecording = () => {
    if (!faceDetected) {
      alert('Please position your face within the circle before recording');
      return;
    }
    
    startRecording();
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] mb-6 w-full">
        {cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
            <div className="w-10 h-10 border-4 border-t-primary border-gray-600 rounded-full animate-spin"></div>
          </div>
        )}
        
        {!hasCamera && !cameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center">
              <span className="material-icons text-error text-4xl mb-2">videocam_off</span>
              <p className="text-white">Camera access is required</p>
              <button 
                className="mt-3 bg-primary text-white px-4 py-2 rounded-md"
                onClick={startCamera}
              >
                Enable Camera
              </button>
            </div>
          </div>
        )}
        
        <video 
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Face positioning guide */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`w-48 h-48 rounded-full border-2 border-dashed ${faceDetected ? 'border-green-500' : 'border-white'} opacity-70`}></div>
        </div>
      </div>
      
      {isRecording && (
        <div className="flex items-center justify-center mt-4 space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording... {recordingTime}s</span>
        </div>
      )}
      
      {!isRecording && (
        <button 
          className="bg-primary text-white px-4 py-3 rounded-md w-full font-bold"
          onClick={handleStartRecording}
          disabled={!hasCamera || cameraLoading}
        >
          START RECORDING
        </button>
      )}
    </div>
  );
};

export default CameraView;

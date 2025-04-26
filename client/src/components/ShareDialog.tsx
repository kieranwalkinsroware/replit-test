import React, { useState } from 'react';
import SocialShareButtons from './SocialShareButtons';
import CustomButton from './CustomButton';
import { Video } from '../types';

interface ShareDialogProps {
  video: Video;
  isOpen: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ video, isOpen, onClose }) => {
  const [customMessage, setCustomMessage] = useState('');
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [shareTracking, setShareTracking] = useState<Record<string, number>>({});
  
  if (!isOpen) return null;
  
  const url = video.videoUrl;
  const defaultTitle = `Check out my custom AI video created with VOTA!`;
  const defaultDescription = video.prompt;
  
  const getShareMessage = () => {
    if (customMessage) return customMessage;
    return `${defaultTitle} "${video.title}" - ${defaultDescription}`;
  };
  
  const handleShare = (platform: string) => {
    // Track which platforms are being used for sharing
    setShareTracking(prev => ({
      ...prev,
      [platform]: (prev[platform] || 0) + 1
    }));
  };
  
  const handleCustomMessageToggle = () => {
    setShowCustomMessage(!showCustomMessage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-lg max-w-lg w-full p-5 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Share Your AI Video</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="mb-5">
          <div className="aspect-video relative rounded-lg overflow-hidden mb-3">
            {video.videoUrl ? (
              <video
                src={video.videoUrl}
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                muted
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <span className="text-white">Video not available</span>
              </div>
            )}
          </div>
          
          <h3 className="font-bold">{video.title}</h3>
          <p className="text-sm text-gray-400">{video.prompt}</p>
        </div>
        
        {showCustomMessage && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Customize your share message:
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={getShareMessage()}
              className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-primary focus:outline-none text-sm"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Personalize the message that will appear when sharing this video.
            </p>
          </div>
        )}
        
        <div className="mb-2 flex justify-end">
          <button 
            onClick={handleCustomMessageToggle}
            className="text-sm text-primary hover:text-primary-dark flex items-center"
          >
            <span className="material-icons text-sm mr-1">
              {showCustomMessage ? 'remove' : 'add'}
            </span>
            {showCustomMessage ? 'Hide Custom Message' : 'Add Custom Message'}
          </button>
        </div>
        
        <SocialShareButtons
          url={url}
          title={defaultTitle}
          description={defaultDescription}
          onShare={handleShare}
        />
        
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
          <CustomButton onClick={onClose} secondary>
            Close
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default ShareDialog;
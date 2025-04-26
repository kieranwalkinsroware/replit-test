import React, { useState } from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  LinkedinShareButton,
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  TelegramIcon,
  LinkedinIcon,
  EmailIcon
} from 'react-share';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  onShare?: (platform: string) => void;
}

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  url,
  title,
  description = '',
  hashtags = ['VOTA', 'AI', 'PersonalizedVideo'],
  onShare
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fullMessage = description ? `${title} - ${description}` : title;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      
      // Reset the copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      
      if (onShare) {
        onShare('copy-link');
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const trackShare = (platform: string) => {
    if (onShare) {
      onShare(platform);
    }
  };

  return (
    <div className="social-share-container">
      <h3 className="text-lg font-bold mb-3">Share Your Video</h3>
      
      <p className="text-sm text-gray-400 mb-4">
        Click on any social icon below to share your VOTA AI-generated video with friends and family!
      </p>
      
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col items-center">
          <FacebookShareButton 
            url={url}
            className="flex items-center justify-center"
            onClick={() => trackShare('facebook')}
          >
            <FacebookIcon size={48} round />
          </FacebookShareButton>
          <span className="text-xs mt-1">Facebook</span>
        </div>
        
        <div className="flex flex-col items-center">
          <TwitterShareButton 
            url={url} 
            title={fullMessage}
            hashtags={hashtags}
            className="flex items-center justify-center"
            onClick={() => trackShare('twitter')}
          >
            <TwitterIcon size={48} round />
          </TwitterShareButton>
          <span className="text-xs mt-1">Twitter</span>
        </div>
        
        <div className="flex flex-col items-center">
          <WhatsappShareButton 
            url={url} 
            title={fullMessage}
            className="flex items-center justify-center"
            onClick={() => trackShare('whatsapp')}
          >
            <WhatsappIcon size={48} round />
          </WhatsappShareButton>
          <span className="text-xs mt-1">WhatsApp</span>
        </div>
        
        <div className="flex flex-col items-center">
          <TelegramShareButton 
            url={url} 
            title={fullMessage}
            className="flex items-center justify-center"
            onClick={() => trackShare('telegram')}
          >
            <TelegramIcon size={48} round />
          </TelegramShareButton>
          <span className="text-xs mt-1">Telegram</span>
        </div>
        
        <div className="flex flex-col items-center">
          <LinkedinShareButton 
            url={url} 
            title={title}
            summary={description}
            source="VOTA AI"
            className="flex items-center justify-center"
            onClick={() => trackShare('linkedin')}
          >
            <LinkedinIcon size={48} round />
          </LinkedinShareButton>
          <span className="text-xs mt-1">LinkedIn</span>
        </div>
        
        <div className="flex flex-col items-center">
          <EmailShareButton 
            url={url} 
            subject={`Check out my VOTA AI Video: ${title}`}
            body={`${fullMessage}\n\nWatch it here: `}
            className="flex items-center justify-center"
            onClick={() => trackShare('email')}
          >
            <EmailIcon size={48} round />
          </EmailShareButton>
          <span className="text-xs mt-1">Email</span>
        </div>
        
        <div className="flex flex-col items-center">
          <button 
            onClick={handleCopyLink}
            className={`bg-gray-700 hover:bg-gray-600 transition-colors text-white rounded-full w-[48px] h-[48px] flex items-center justify-center ${copySuccess ? 'bg-green-600' : ''}`}
          >
            <span className="material-icons text-xl">{copySuccess ? 'check' : 'link'}</span>
          </button>
          <span className="text-xs mt-1">{copySuccess ? 'Copied!' : 'Copy Link'}</span>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400">
        <p className="font-medium text-gray-300 mb-1">About sharing:</p>
        <p>When you click a share button, the video URL and a custom message will be shared to your chosen platform. You can edit the message before posting.</p>
      </div>
    </div>
  );
};

export default SocialShareButtons;
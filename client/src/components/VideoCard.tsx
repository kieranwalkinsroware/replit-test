import React from 'react';
import { SampleVideo } from '../types';

interface VideoCardProps {
  video: SampleVideo;
  onClick?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden mb-6" onClick={onClick}>
      <div className="aspect-video relative">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-icons text-5xl opacity-70">play_circle</span>
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold">{video.title}</h4>
      </div>
    </div>
  );
};

export default VideoCard;

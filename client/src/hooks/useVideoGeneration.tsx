import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { Video } from '../types';

// Polling intervals in milliseconds
const TRAINING_POLL_INTERVAL = 5000; // 5 seconds
const VIDEO_GENERATION_POLL_INTERVAL = 3000; // 3 seconds

export const useVideoGeneration = () => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [trainingId, setTrainingId] = useState<number | null>(null);
  const [videoId, setVideoId] = useState<number | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  
  // Poll for training status
  useEffect(() => {
    if (!trainingId || trainingStatus === 'completed' || trainingStatus === 'failed') {
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    
    const checkTrainingStatus = async () => {
      try {
        const response = await apiRequest('GET', `/api/training/${trainingId}`);
        const data = await response.json();
        
        setTrainingStatus(data.status);
        
        if (data.status !== 'completed' && data.status !== 'failed') {
          // Continue polling if not complete
          timeoutId = setTimeout(checkTrainingStatus, TRAINING_POLL_INTERVAL);
        }
      } catch (err) {
        console.error('Error checking training status:', err);
        setError('Failed to check training status');
      }
    };
    
    // Start polling
    timeoutId = setTimeout(checkTrainingStatus, TRAINING_POLL_INTERVAL);
    
    // Clean up on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [trainingId, trainingStatus]);
  
  // Poll for video generation status
  useEffect(() => {
    if (!videoId || generationStatus === 'completed' || generationStatus === 'failed') {
      return;
    }
    
    let timeoutId: NodeJS.Timeout;
    
    const checkVideoStatus = async () => {
      try {
        const response = await apiRequest('GET', `/api/videos/${videoId}`);
        const data = await response.json();
        
        setGenerationStatus(data.status);
        setVideo(data);
        
        if (data.status !== 'completed' && data.status !== 'failed') {
          // Continue polling if not complete
          timeoutId = setTimeout(checkVideoStatus, VIDEO_GENERATION_POLL_INTERVAL);
        } else if (data.status === 'completed') {
          // Query cache invalidation on completion
          queryClient.invalidateQueries({ queryKey: ['/api/videos', videoId] });
        }
      } catch (err) {
        console.error('Error checking video generation status:', err);
        setError('Failed to check video generation status');
      }
    };
    
    // Start polling
    timeoutId = setTimeout(checkVideoStatus, VIDEO_GENERATION_POLL_INTERVAL);
    
    // Clean up on unmount
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [videoId, generationStatus, queryClient]);
  
  // Function to start the training and video generation process
  const generateVideo = useCallback(async (userId: string, prompt: string, videoData: string) => {
    setIsGenerating(true);
    setError(null);
    setTrainingStatus('pending');
    setGenerationStatus(null);
    setTrainingId(null);
    setVideoId(null);
    setVideo(null);
    
    try {
      // Step 1: Submit the training video to create a LoRA model
      const trainingResponse = await apiRequest('POST', '/api/training', {
        userId: Number(userId),
        videoData
      });
      
      const trainingResult = await trainingResponse.json();
      
      if (trainingResult.error) {
        throw new Error(trainingResult.error);
      }
      
      setTrainingId(trainingResult.trainingId);
      
      // Step 2: Poll for training completion (handled by useEffect)
      // The UI will show a loading state during this time
      
      // Step 3: Wait for training to complete before generating video
      if (trainingResult.loraId) {
        // If we already have a loraId in the response, we can proceed to video generation
        setTrainingStatus('completed');
        
        // Generate the video based on the prompt
        const videoResponse = await apiRequest('POST', '/api/videos', {
          userId: Number(userId),
          title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
          prompt,
          videoUrl: '',
          status: 'processing',
        });
        
        const videoResult = await videoResponse.json();
        
        if (videoResult.error) {
          throw new Error(videoResult.error);
        }
        
        setVideoId(videoResult.videoId);
        setGenerationStatus('processing');
        
        // Step 4: Poll for video generation completion (handled by useEffect)
        
        // Return the result with initial data
        return videoResult;
      }
      
      // Return the training result
      return trainingResult;
    } catch (err) {
      console.error('Error in video generation process:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      // Keep isGenerating true until both processes complete
      if ((trainingStatus === 'completed' || trainingStatus === 'failed') && 
          (generationStatus === 'completed' || generationStatus === 'failed')) {
        setIsGenerating(false);
      }
    }
  }, [trainingStatus, generationStatus, queryClient]);
  
  // Function to check if an existing LoRA is available and generate video
  const generateVideoWithExistingLora = useCallback(async (userId: string, prompt: string) => {
    setIsGenerating(true);
    setError(null);
    setGenerationStatus('pending');
    setVideoId(null);
    setVideo(null);
    
    try {
      // Generate the video based on the prompt using existing LoRA
      const videoResponse = await apiRequest('POST', '/api/videos', {
        userId: Number(userId),
        title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
        prompt,
        videoUrl: '',
        status: 'processing',
      });
      
      const videoResult = await videoResponse.json();
      
      if (videoResult.error) {
        throw new Error(videoResult.error);
      }
      
      setVideoId(videoResult.videoId);
      setGenerationStatus('processing');
      
      // Poll for video generation completion (handled by useEffect)
      
      // Invalidate any existing queries
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'videos'] });
      
      return videoResult;
    } catch (err) {
      console.error('Error generating video with existing LoRA:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    }
  }, [queryClient]);
  
  return {
    generateVideo,
    generateVideoWithExistingLora,
    isGenerating,
    error,
    trainingStatus,
    generationStatus,
    video,
    reset: () => {
      setIsGenerating(false);
      setError(null);
      setTrainingStatus(null);
      setGenerationStatus(null);
      setTrainingId(null);
      setVideoId(null);
      setVideo(null);
    }
  };
};

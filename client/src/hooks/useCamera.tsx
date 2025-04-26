import { useRef, useState, useCallback, useEffect } from 'react';
import { RECORDING_TIME } from '../constants';

interface UseCameraProps {
  maxRecordingTime?: number;
  videoQuality?: 'low' | 'medium' | 'high';
}

export const useCamera = ({ 
  maxRecordingTime = RECORDING_TIME,
  videoQuality = 'medium' 
}: UseCameraProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(maxRecordingTime);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);

  // Get camera constraints based on quality
  const getCameraConstraints = useCallback(() => {
    const baseConstraints = {
      audio: true,
      video: {
        facingMode: 'user'
      }
    };

    // Configure video quality settings
    switch (videoQuality) {
      case 'low':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 640 },
            height: { ideal: 480 },
          }
        };
      case 'high':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        };
      case 'medium':
      default:
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        };
    }
  }, [videoQuality]);
  
  // Start the camera
  const startCamera = useCallback(async () => {
    setCameraLoading(true);
    setCameraError(null);
    setFaceDetected(false);
    
    try {
      // Stop any existing streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = getCameraConstraints();
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Make sure video is playing before proceeding
        await videoRef.current.play();
      }
      
      streamRef.current = stream;
      setHasCamera(true);
      
      // In a real implementation, this would be replaced with actual face detection
      // For demo purposes, we simulate face detection with a timer
      setTimeout(() => {
        setFaceDetected(true);
      }, 2000);
      
    } catch (err) {
      console.error('Error accessing camera:', err);
      setHasCamera(false);
      if (err instanceof Error) {
        setCameraError(err.message);
      } else {
        setCameraError('Could not access camera');
      }
    } finally {
      setCameraLoading(false);
    }
  }, [getCameraConstraints]);
  
  // Get video recording options based on quality
  const getRecorderOptions = useCallback(() => {
    // Check if specific codecs are supported
    const checkCodecSupport = (mimeType: string) => {
      try {
        return MediaRecorder.isTypeSupported(mimeType);
      } catch (e) {
        console.warn(`Codec check failed for ${mimeType}:`, e);
        return false;
      }
    };
    
    // Try different mime types with fallbacks
    if (checkCodecSupport('video/webm;codecs=vp9')) {
      // High quality vp9
      return { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: videoQuality === 'high' ? 2500000 : 
                            videoQuality === 'low' ? 500000 : 1000000
      };
    } else if (checkCodecSupport('video/webm;codecs=vp8')) {
      // Standard vp8
      return { 
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: videoQuality === 'high' ? 2000000 : 
                           videoQuality === 'low' ? 500000 : 1000000
      };
    } else if (checkCodecSupport('video/webm')) {
      // Generic webm
      return { 
        mimeType: 'video/webm',
        videoBitsPerSecond: videoQuality === 'high' ? 2000000 : 
                           videoQuality === 'low' ? 500000 : 1000000
      };
    } else {
      // Last resort - no specific mime type
      console.warn('No supported video mime types found, using browser defaults');
      return {};
    }
  }, [videoQuality]);
  
  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      console.error('No camera stream available');
      setCameraError('No camera stream available. Please restart the camera.');
      return;
    }
    
    // Verify the camera stream has video tracks
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length === 0) {
      console.error('No video tracks in stream');
      setCameraError('Camera video not available. Please check camera permissions and try again.');
      return;
    }
    
    // Log track info for debugging
    console.log('Video tracks:', videoTracks.map(track => ({
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      id: track.id,
      label: track.label
    })));
    
    // Reset video data and chunks
    setVideoData(null);
    chunksRef.current = [];
    setRecordingProgress(0);
    setCameraError(null);
    
    try {
      // Get codec options with fallbacks
      const options = getRecorderOptions();
      console.log('Using MediaRecorder options:', options);
      
      // Create media recorder with appropriate error handling
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      console.log('MediaRecorder created successfully, state:', mediaRecorder.state);
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setCameraError('Recording error occurred. Please try again.');
      };
      
      mediaRecorder.ondataavailable = (e) => {
        console.log('Data available, size:', e.data.size);
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', chunksRef.current.length);
        if (chunksRef.current.length === 0) {
          console.error('No video data recorded');
          setCameraError('No video data was recorded. Please try again.');
          return;
        }
        
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          console.log('Created blob:', blob.size, 'bytes');
          
          const reader = new FileReader();
          
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Extract only the base64 data part without the data URL prefix
            const base64Content = base64data.split(',')[1];
            console.log('Video data processed, length:', base64Content.length);
            setVideoData(base64Content);
          };
          
          reader.onerror = (event) => {
            console.error('Error reading blob:', event);
            setCameraError('Failed to process recorded video. Please try again.');
          };
          
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error('Error processing recorded data:', error);
          setCameraError('Failed to process recorded video. Please try again.');
        }
      };
      
      // Request data at regular intervals to ensure we get chunks during recording
      mediaRecorderRef.current = mediaRecorder;
      
      // Start the recording
      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder started, state:', mediaRecorder.state);
      
      setIsRecording(true);
      setRecordingTime(maxRecordingTime);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev - 1;
          // Update progress percentage
          setRecordingProgress(((maxRecordingTime - newTime) / maxRecordingTime) * 100);
          
          if (newTime <= 0) {
            clearInterval(countdownInterval);
            stopRecording();
            return 0;
          }
          return newTime;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof Error) {
        setCameraError(`Recording failed: ${err.message}`);
      } else {
        setCameraError('Recording failed with an unknown error');
      }
    }
  }, [maxRecordingTime, getRecorderOptions]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecordingProgress(100);
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    }
  }, []);
  
  // Reset camera and recording state
  const resetCamera = useCallback(() => {
    setVideoData(null);
    setRecordingTime(maxRecordingTime);
    setRecordingProgress(0);
    setCameraError(null);
    chunksRef.current = [];
  }, [maxRecordingTime]);
  
  // Cleanup resources
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear any recording in progress
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);
  
  return {
    videoRef,
    startCamera,
    startRecording,
    stopRecording,
    resetCamera,
    hasCamera,
    cameraLoading,
    isRecording,
    recordingTime,
    videoData,
    faceDetected,
    cameraError,
    recordingProgress
  };
};

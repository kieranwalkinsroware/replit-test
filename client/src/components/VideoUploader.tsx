import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, Video, AlertCircle, Smartphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RECORDING_TIME } from '../constants';

// Maximum file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface VideoUploaderProps {
  onVideoCapture: (videoData: string) => void;
  isUploading?: boolean;
  error?: string;
}

export default function VideoUploader({ onVideoCapture, isUploading = false, error }: VideoUploaderProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [browserSupport, setBrowserSupport] = useState<{
    hasGetUserMedia: boolean;
    hasMediaRecorder: boolean;
    isIOS: boolean;
    isMobile: boolean;
    recommendUpload: boolean;
  }>({
    hasGetUserMedia: false,
    hasMediaRecorder: false,
    isIOS: false,
    isMobile: false,
    recommendUpload: false
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check browser compatibility on mount
  useEffect(() => {
    // Check if we're in a secure context (required for camera access in many browsers)
    const isSecureContext = window.isSecureContext;
    
    // Check if getUserMedia is supported 
    const hasMediaDevices = !!(navigator.mediaDevices);
    const hasGetUserMedia = hasMediaDevices && 
      (typeof navigator.mediaDevices.getUserMedia !== 'undefined') && 
      (isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0');
    
    // Check if MediaRecorder is supported
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    
    // Check if using iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if using mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if we're inside a webview (affects camera permissions)
    const isWebView = 
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) || 
      /Android.*Version\/[0-9].[0-9].*Chrome.*Mobile.*Safari/i.test(navigator.userAgent) ||
      navigator.userAgent.includes('WKWebView');
    
    // Set recommendation based on detected capabilities
    const recommendUpload = !hasMediaRecorder || (isIOS && isWebView) || !hasGetUserMedia || !isSecureContext;
    
    // Set the browser support state
    setBrowserSupport({
      hasGetUserMedia,
      hasMediaRecorder,
      isIOS,
      isMobile,
      recommendUpload
    });
    
    // Log details about the environment for debugging
    console.log('Browser environment:', {
      userAgent: navigator.userAgent,
      isSecureContext,
      host: window.location.hostname,
      protocol: window.location.protocol
    });
    
    console.log('Browser support check:', {
      hasGetUserMedia,
      hasMediaRecorder,
      isIOS,
      isMobile,
      isWebView,
      recommendUpload
    });
    
    // Log a warning if we're not in a secure context and camera access may be affected
    if (!isSecureContext && hasGetUserMedia) {
      console.warn(
        'Application is not running in a secure context (HTTPS). ' +
        'Camera access might be restricted. Consider using HTTPS for full functionality.'
      );
    }
  }, []);

  // Initialize the camera for preview
  const initializeCamera = async () => {
    try {
      setIsCameraLoading(true);
      setFileError(null);
      
      // First, check if permission is already granted or at least asked
      let permissionStatus;
      try {
        // This can fail on some browsers, so wrap in try/catch
        permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        console.log('Camera permission status:', permissionStatus.state);
      } catch (permErr) {
        console.log('Permission API not supported, proceeding anyway');
      }

      // Ultra-simple constraints first to just get camera access
      // This improves compatibility across browsers and devices
      const simpleConstraints = { 
        video: true, 
        audio: false 
      };
      
      console.log('Requesting camera with simple constraints:', JSON.stringify(simpleConstraints));
      console.log('Browser:', navigator.userAgent);
      console.log('Is secure context?', window.isSecureContext);
      
      try {
        // This is the key step that triggers the permission prompt
        console.log('Attempting to access camera...');
        const stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
        console.log('Camera access granted with simple constraints');
        
        // Now try to apply specific constraints if needed
        if (stream) {
          // Stop this initial stream, we'll get a better one
          stream.getTracks().forEach(track => track.stop());
        }
        
        // Now apply more specific constraints for our quality needs
        // iOS-specific camera constraints
        // Special case for iPhone in Replit app
        // Try to give it minimal constraints for better compatibility
        const constraints = browserSupport.isIOS 
          ? { 
              video: { 
                facingMode: 'user',
                // For iPhone, deliberately keep a portrait mode aspect ratio
                width: { ideal: 480 },
                height: { ideal: 640 }
              }, 
              audio: false 
            }
          : {
              video: {
                facingMode: 'user',
                // For other devices, ensure portrait mode (9:16 aspect ratio)
                width: { min: 360, ideal: 540, max: 720 },
                height: { min: 640, ideal: 960, max: 1280 },
                aspectRatio: { ideal: 0.5625 } // 9:16 aspect ratio
              },
              audio: false
            };
        
        console.log('Requesting camera with quality constraints:', JSON.stringify(constraints));
        const qualityStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = qualityStream;
        
        // Display the camera feed in the video element
        if (videoRef.current) {
          try {
            videoRef.current.srcObject = qualityStream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            
            // Play the video without awaiting
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  console.log('Camera preview started successfully');
                  setCameraActive(true);
                  setIsCameraLoading(false);
                })
                .catch(playErr => {
                  console.error('Error playing video:', playErr);
                  // Try without play on iOS
                  setCameraActive(true);
                  setIsCameraLoading(false);
                });
            } else {
              console.log('Play promise undefined, assuming success');
              setCameraActive(true);
              setIsCameraLoading(false);
            }
          } catch (videoErr) {
            console.error('Error setting video source:', videoErr);
            setFileError('Error displaying camera feed. Please try again.');
            setIsCameraLoading(false);
          }
        } else {
          console.error('Video element ref is null');
          setFileError('Could not initialize video element.');
          setIsCameraLoading(false);
        }
      } catch (streamErr) {
        console.error('Error getting media stream with specific constraints:', streamErr);
        // Try with absolute minimum constraints as fallback
        try {
          const minimalConstraints = { 
            video: { 
              facingMode: 'user' 
            }, 
            audio: false 
          };
          console.log('Fallback to minimal constraints:', JSON.stringify(minimalConstraints));
          const fallbackStream = await navigator.mediaDevices.getUserMedia(minimalConstraints);
          streamRef.current = fallbackStream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(() => {}); // Ignore play errors
            setCameraActive(true);
          }
        } catch (finalErr) {
          console.error('Final error accessing camera:', finalErr);
          throw finalErr; // Re-throw to be caught by the outer catch
        }
      }
    } catch (err) {
      console.error('Error initializing camera:', err);
      setFileError('Could not access camera. Please make sure you have granted permission and the camera is not in use by another application.');
      setIsCameraLoading(false);
    } finally {
      setIsCameraLoading(false);
    }
  };
  
  // Stop camera preview
  const stopCameraPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
  };
  
  // Start recording video from the device camera
  const startRecording = async () => {
    try {
      // If camera isn't active, we need to initialize it first
      if (!cameraActive) {
        await initializeCamera();
        // Wait a moment to ensure the camera is ready
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Reset any previous recordings
      setVideoSrc(null);
      setFileError(null);
      chunksRef.current = [];

      // Stop the current stream to release all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Get a fresh stream with both video and audio
      let hasAudio = true;
      let newStream;
      
      try {
        console.log('Requesting camera with audio for recording');
        // Use the same constraint pattern as for preview, but with audio
        const recordingConstraints = browserSupport.isIOS 
          ? { 
              video: { 
                facingMode: 'user',
                width: { ideal: 480 },
                height: { ideal: 640 }
              }, 
              audio: true 
            }
          : {
              video: {
                facingMode: 'user',
                width: { min: 360, ideal: 540, max: 720 },
                height: { min: 640, ideal: 960, max: 1280 },
                aspectRatio: { ideal: 0.5625 } // 9:16 aspect ratio
              },
              audio: true
            };
            
        console.log('Recording with constraints:', JSON.stringify(recordingConstraints));
        newStream = await navigator.mediaDevices.getUserMedia(recordingConstraints);
      } catch (audioError) {
        console.error('Error getting media stream with audio:', audioError);
        // On error, try to continue with just video (no audio)
        hasAudio = false;
        setFileError('Unable to access microphone. Recording will proceed without audio.');
        
        // Try again with video only
        try {
          console.log('Falling back to video-only recording');
          // Ultra simplified fallback constraints for all devices
          const fallbackConstraints = {
            video: {
              facingMode: 'user'
            },
            audio: false
          };
              
          console.log('Fallback recording with constraints:', JSON.stringify(fallbackConstraints));
          newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } catch (videoError) {
          console.error('Error getting video-only stream:', videoError);
          throw new Error('Cannot access camera for recording');
        }
      }
      
      // At this point we should have a valid stream (with or without audio)
      streamRef.current = newStream;
        
      // Display the camera feed in the video element
      if (videoRef.current) {
        try {
          videoRef.current.srcObject = newStream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          
          // Play the video without awaiting
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .catch(playErr => {
                console.error('Error playing video in recording mode:', playErr);
                // Continue anyway for iOS
              });
          }
        } catch (videoErr) {
          console.error('Error setting video source for recording:', videoErr);
          throw new Error('Cannot display camera feed for recording');
        }
      } else {
        console.error('Video element ref is null');
        throw new Error('Video element not available');
      }
        
      // Create a media recorder - try different formats for better mobile compatibility
      let mediaRecorder;
      let mimeType = '';
      
      // Check for various supported formats in priority order
      const formats = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4;codecs=h264,aac',
        'video/webm',
        'video/mp4',
      ];
      
      // For iOS, try MP4 first since it's better supported
      if (browserSupport.isIOS) {
        formats.unshift('video/mp4');
      }
      
      // Find the first supported MIME type
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          console.log('Using MIME type:', mimeType);
          break;
        }
      }
      
      // Create the MediaRecorder with appropriate options
      const recorderOptions: MediaRecorderOptions = {
        mimeType: mimeType || undefined,
        // For iOS, use lower video bitrate for better compatibility
        videoBitsPerSecond: browserSupport.isIOS ? 1_000_000 : 2_500_000,
      };
      
      console.log('Creating MediaRecorder with options:', recorderOptions);
      mediaRecorder = new MediaRecorder(newStream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers for the recorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        
        if (streamRef.current) {
          // Stop all tracks
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Create a blob from the recorded chunks
        // Use the appropriate mime type based on what was supported
        const blobType = mimeType && mimeType.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        
        // Create a URL for the blob
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);
        
        // Reset recording state
        setIsRecording(false);
        setRecordingTime(0);
        setRecordingProgress(0);
        
        // Notify parent component about the recorded video
        if (chunksRef.current.length > 0) {
          // Read as base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            console.log('Recorded video size:', Math.round(base64data.length / (1024 * 1024) * 100) / 100, 'MB');
            onVideoCapture(base64data);
          };
          reader.readAsDataURL(blob);
        }
      };
      
      // Start the recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Set up a timer to update recording time and progress
      let elapsed = 0;
      timerRef.current = window.setInterval(() => {
        elapsed += 0.1;
        setRecordingTime(elapsed);
        
        // Calculate and update progress as a percentage
        const progress = (elapsed / RECORDING_TIME) * 100;
        setRecordingProgress(Math.min(progress, 100));
        
        // Stop recording after RECORDING_TIME seconds
        if (elapsed >= RECORDING_TIME && mediaRecorderRef.current) {
          clearInterval(timerRef.current!);
          mediaRecorderRef.current.stop();
        }
      }, 100);
    } catch (err) {
      console.error('Error starting recording:', err);
      setFileError('Error starting recording. Please make sure you have granted permission for camera and microphone access.');
      setIsRecording(false);
    }
  };
  
  // Stop recording video
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
  };

  // Handle file upload
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    // Reset previous state
    setVideoSrc(null);
    setFileError(null);
    
    console.log('File selected:', file.name, 'Size:', (file.size / (1024 * 1024)).toFixed(2) + 'MB', 'Type:', file.type);
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('video/')) {
      setFileError('Please upload a video file.');
      return;
    }
    
    // Create a video preview URL immediately
    const objectUrl = URL.createObjectURL(file);
    console.log('Created object URL for preview:', objectUrl.substring(0, 30) + '...');
    setVideoSrc(objectUrl);
    
    // Now read the file as base64 for actual upload
    console.log('Reading file as base64 data...');
    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log('File reading started');
    };
    
    reader.onloadend = () => {
      if (reader.result) {
        const resultStr = reader.result.toString();
        console.log('File read completed, data size:', Math.round(resultStr.length / 1024), 'KB');
        
        // Call onVideoCapture with the base64 data BEFORE checking videoSrc state
        // This ensures the parent component gets the data even if state updates are delayed
        const base64data = reader.result as string;
        
        // First explicitly call with the raw data
        console.log('Calling onVideoCapture with file data');
        onVideoCapture(base64data);
        
        // Then log the current UI state with a delay
        setTimeout(() => {
          console.log('After file upload - videoSrc:', !!videoSrc);
        }, 100);
      } else {
        console.error('File read completed but result is null');
        setFileError('Error processing video. Please try a different video file.');
      }
    };
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        console.log('File read progress:', percentComplete.toFixed(2) + '%');
      }
    };
    reader.onerror = () => {
      console.error('Error reading file:', reader.error);
      setFileError('Error reading file. Please try again.');
    };
    
    // Start reading the file
    console.log('Starting to read file as Data URL');
    reader.readAsDataURL(file);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div 
          className="mb-4 bg-black rounded-md overflow-hidden relative w-full"
          style={{ 
            aspectRatio: "9/16"
          }}
        >
          {videoSrc ? (
            <>
              {/* iOS special video player */}
              {browserSupport.isIOS ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900">
                  <video 
                    ref={videoRef}
                    src={videoSrc} 
                    className="w-full h-full object-contain" 
                    controls
                    autoPlay
                    playsInline
                    loop
                    muted={false}
                    preload="auto"
                    controlsList="nodownload"
                    style={{ maxHeight: "100%", objectFit: "contain", width: "100%" }}
                  />
                </div>
              ) : (
                /* Regular video player for non-iOS */
                <video 
                  ref={videoRef}
                  src={videoSrc} 
                  className="w-full h-full object-contain" 
                  controls
                  autoPlay
                  playsInline
                  loop
                  muted={false}
                  style={{ maxHeight: "100%", objectFit: "contain", width: "100%" }}
                />
              )}
            </>
          ) : (
            <video 
              ref={videoRef}
              className="w-full h-full" 
              muted
              playsInline
              style={{ 
                objectFit: browserSupport.isIOS ? "cover" : "contain",
                width: "100%",
                height: "100%"
              }}
            />
          )}
          
          {cameraActive && !isRecording && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
              <div className="flex items-center justify-between text-white mb-1">
                <span>Camera Preview</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  READY
                </span>
              </div>
            </div>
          )}
          
          {isRecording && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50">
              <div className="flex items-center justify-between text-white mb-1">
                <span>Recording: {recordingTime.toFixed(1)}s</span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                  RECORDING
                </span>
              </div>
              <Progress value={recordingProgress} className="h-1" />
            </div>
          )}
        </div>
        
        {fileError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {fileError}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Show normal progress messages with a different styling */}
        {!fileError && isUploading && (
          <Alert variant="default" className="mb-4 bg-gray-800 border-gray-700">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <AlertTitle>Uploading</AlertTitle>
            <AlertDescription>
              Processing your video... This may take a moment.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-2">
          {!isRecording && !isUploading && !videoSrc && !cameraActive && (
            <>
              {/* Show device compatibility message if needed */}
              {browserSupport.recommendUpload && (
                <Alert className="mb-4">
                  <Smartphone className="h-4 w-4" />
                  <AlertTitle>Device Compatibility</AlertTitle>
                  <AlertDescription>
                    {browserSupport.isIOS 
                      ? "Your iOS device may have limited camera recording support. If you encounter issues, please use the 'Upload Video' option." 
                      : "Your device may have limited camera recording support. If recording doesn't work, please use the 'Upload Video' option."}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={initializeCamera} 
                className="flex items-center justify-center"
                variant={browserSupport.recommendUpload ? "outline" : "default"}
                disabled={isCameraLoading || !browserSupport.hasGetUserMedia}
              >
                {isCameraLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Video className="mr-2 h-4 w-4" />
                )}
                {isCameraLoading ? 'Loading Camera...' : 'Open Camera'}
              </Button>
              
              <div className="relative">
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="flex items-center justify-center w-full"
                  variant={browserSupport.recommendUpload ? "default" : "outline"}
                  disabled={isCameraLoading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </Button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="video/*" 
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </>
          )}
          
          {cameraActive && !isRecording && !videoSrc && (
            <div className="flex justify-between space-x-2">
              <Button 
                onClick={stopCameraPreview} 
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button 
                onClick={startRecording}
                variant="default"
                className="flex-1"
              >
                Start Recording
              </Button>
            </div>
          )}
          
          {isRecording && (
            <Button 
              onClick={stopRecording} 
              className="flex items-center justify-center"
              variant="destructive"
            >
              Stop Recording
            </Button>
          )}
          
          {isUploading && (
            <Button disabled className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </Button>
          )}
          
          {videoSrc && !isUploading && (
            <div className="flex flex-col space-y-2">
              <p className="text-center text-sm text-slate-500 my-2">
                Video recorded successfully! Review your video, then press Continue below.
              </p>
            
              <Button 
                onClick={() => {
                  setVideoSrc(null);
                  setFileError(null);
                }} 
                variant="outline"
                className="w-full"
              >
                <span className="mr-2">👎</span> Record Again
              </Button>
            </div>
          )}
          
          {/* Use useEffect to process video when videoSrc changes */}
          {(() => {
            // When videoSrc changes, process the video 
            useEffect(() => {
              if (!videoSrc) return;
              
              const processVideo = async () => {
                try {
                  // For videos with recorded chunks (from MediaRecorder)
                  if (chunksRef.current.length > 0) {
                    console.log('Processing recorded chunks...');
                    // Already handled in stopRecording
                  }
                  // For uploaded videos via file input (blob URL)
                  else if (videoSrc.startsWith('blob:')) {
                    console.log('Processing uploaded video from blob URL...');
                    try {
                      const response = await fetch(videoSrc);
                      const blob = await response.blob();
                      
                      console.log('Fetched blob size:', Math.round(blob.size / (1024 * 1024) * 100) / 100, 'MB');
                      
                      // If blob is too large (>15MB), warn the user
                      if (blob.size > 15 * 1024 * 1024) {
                        setFileError('Video is very large and may take a while to upload. If upload fails, try using a shorter video.');
                      }
                      
                      // Convert to base64
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (reader.result) {
                          const base64data = reader.result as string;
                          console.log('Video processed, size:', Math.round(base64data.length / (1024 * 1024) * 100) / 100, 'MB');
                          onVideoCapture(base64data);
                        }
                      };
                      reader.readAsDataURL(blob);
                    } catch (err) {
                      console.error('Error processing blob URL:', err);
                    }
                  }
                } catch (err) {
                  console.error('Error in video processing:', err);
                }
              };
              
              // Process with a small delay to ensure UI has updated
              setTimeout(processVideo, 300);
            }, [videoSrc]);
            
            return null; // This IIFE doesn't render anything
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

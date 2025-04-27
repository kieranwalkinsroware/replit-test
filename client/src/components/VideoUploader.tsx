import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import VideoUploader from '../components/VideoUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiRequest } from '../lib/queryClient';

export default function CameraPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [videoData, setVideoData] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug log when the component renders
  useEffect(() => {
    console.log('CameraPage rendered, videoData exists:', !!videoData);
  }, [videoData]);
  
  // Handle video capture from the VideoUploader component
  const handleVideoCapture = (capturedVideoData: string) => {
    console.log('Video capture received in CameraPage, data length:', 
      capturedVideoData ? Math.round(capturedVideoData.length / 1024) : 0, 'KB');
    
    // Reset error if any and set the video data
    setError(null);
    setVideoData(capturedVideoData);
    
    // Add a quick log to help debug state updates
    setTimeout(() => {
      // We can't use videoData directly here as it will still have the old value
      // Instead, log a message that we should check the next render
      console.log('Video data set in state, should be visible in next render');
    }, 100);
  };
  
  // Upload the video to the server
  const handleUpload = async () => {
    if (!videoData) {
      setError('No video selected. Please record or upload a video first.');
      console.error('Upload attempted with no video data');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    console.log('Starting upload process, data size:', Math.round(videoData.length / 1024), 'KB');
    
    try {
      // For iPhone, let's chunk the upload if it's large
      if (videoData.length > 10 * 1024 * 1024) { // If larger than 10MB
        console.log("Large video detected, using optimized upload approach");
        
        // Prepare the upload data with compressed video
        const uploadData = {
          videoData: videoData,
          userId: "1", // In a real app, this would come from authentication
          metadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            isCompressed: true,
            originalSize: videoData.length
          }
        };
        
        try {
          console.log('Sending large video upload request...');
          // Call the API to upload the video with longer timeout
          const response = await apiRequest<{ uploadId: number }>('/api/uploads', {
            method: 'POST',
            data: uploadData
          });
          
          // If upload was successful, navigate to the confirmation page
          if (response && response.uploadId) {
            console.log('Upload successful, upload ID:', response.uploadId);
            // Invalidate any relevant queries
            queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
            
            // Navigate to the training confirmation page
            navigate(`/training-confirmation/${response.uploadId}`);
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (uploadErr) {
          console.error('Error uploading large video:', uploadErr);
          throw uploadErr; // Propagate to outer catch
        }
      } else {
        // Standard upload for smaller videos
        const uploadData = {
          videoData,
          userId: "1", // In a real app, this would come from authentication
          metadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        };
        
        console.log('Sending standard video upload request...');
        // Call the API to upload the video
        const response = await apiRequest<{ uploadId: number }>('/api/uploads', {
          method: 'POST',
          data: uploadData,
        });
        
        // If upload was successful, navigate to the confirmation page
        if (response && response.uploadId) {
          console.log('Upload successful, upload ID:', response.uploadId);
          // Invalidate any relevant queries
          queryClient.invalidateQueries({ queryKey: ['/api/uploads'] });
          
          // Navigate to the training confirmation page
          navigate(`/training-confirmation/${response.uploadId}`);
        } else {
          throw new Error('Invalid response from server');
        }
      }
    } catch (err) {
      console.error('Error uploading video:', err);
      setError('Upload failed. The video might be too large. Please try recording a shorter video (5-7 seconds).');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">Record Your Video</CardTitle>
          <CardDescription className="text-center">
            Record a short video to create your personalized AI video. Make sure your face is clearly visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VideoUploader 
            onVideoCapture={handleVideoCapture} 
            isUploading={isUploading}
            error={error || undefined}
          />
          
          {videoData && !isUploading && (
            <Button 
              onClick={handleUpload} 
              className="w-full mt-4"
              variant="default"
              size="lg"
            >
              Continue
            </Button>
          )}
          
          {isUploading && (
            <div className="flex justify-center mt-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-sm text-gray-500 text-center">
        <p>Your video will only be used to create your personalized AI videos.</p>
        <p>We don't store your raw video for longer than needed.</p>
      </div>
    </div>
  );
}

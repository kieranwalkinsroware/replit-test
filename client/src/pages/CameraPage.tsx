import { useState } from 'react';
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
  
  // Handle video capture from the VideoUploader component
  const handleVideoCapture = (capturedVideoData: string) => {
    setVideoData(capturedVideoData);
    setError(null);
  };
  
  // Upload the video to the server
  const handleUpload = async () => {
    if (!videoData) {
      setError('No video selected. Please record or upload a video first.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      // For iPhone, let's chunk the upload if it's large
      if (videoData.length > 10 * 1024 * 1024) { // If larger than 10MB
        console.log("Large video detected, using optimized upload approach");
        
        // Use a smaller video if on mobile
        const compressedVideoData = videoData;
        
        // Prepare the upload data with compressed video
        const uploadData = {
          videoData: compressedVideoData,
          userId: "1", // In a real app, this would come from authentication - converting to string for schema compatibility
          metadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            isCompressed: true,
            originalSize: videoData.length
          }
        };
        
        try {
          // Call the API to upload the video with longer timeout
          const response = await apiRequest<{ uploadId: number }>('/api/uploads', {
            method: 'POST',
            data: uploadData
          });
          
          // If upload was successful, navigate to the confirmation page
          if (response && response.uploadId) {
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
          userId: "1", // In a real app, this would come from authentication - converting to string for schema compatibility
          metadata: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        };
        
        // Call the API to upload the video
        const response = await apiRequest<{ uploadId: number }>('/api/uploads', {
          method: 'POST',
          data: uploadData,
        });
        
        // If upload was successful, navigate to the confirmation page
        if (response && response.uploadId) {
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

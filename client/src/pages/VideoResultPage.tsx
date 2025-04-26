import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Download, Share2, Plus } from 'lucide-react';
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  WhatsappShareButton, 
  TelegramShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  TelegramIcon
} from 'react-share';

export default function VideoResultPage() {
  const [match, params] = useRoute('/video/:videoId');
  const [, navigate] = useLocation();
  const [shareUrl, setShareUrl] = useState('');
  
  // Get the video ID from the route params
  const videoId = match ? Number(params?.videoId) : null;
  
  // Query to fetch the video details
  const { 
    data: video, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['/api/videos', videoId],
    queryFn: async () => {
      if (!videoId) return null;
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video details');
      }
      return response.json();
    },
    enabled: !!videoId, // Only run the query if we have a videoId
    refetchInterval: (data) => {
      // If the video is still processing, refetch every 2 seconds
      if (data && typeof data === 'object' && 'status' in data) {
        return data.status === 'processing' ? 2000 : false;
      }
      return false;
    }
  });
  
  // Set up sharing URL
  useEffect(() => {
    if (video?.videoUrl) {
      // Create a shareable URL for the video
      const currentUrl = window.location.href;
      setShareUrl(currentUrl);
    }
  }, [video]);
  
  // Handle download button click
  const handleDownload = () => {
    if (video?.videoUrl) {
      // Create a temporary link element to download the video
      const a = document.createElement('a');
      a.href = video.videoUrl;
      a.download = `vota-video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Handle create new video button click
  const handleCreateNew = () => {
    // Navigate to the interact page to create a new video
    navigate('/interact');
  };
  
  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !videoId) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error?.toString() || 'Invalid video ID. Please try again.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/interact')} 
              className="w-full"
              variant="default"
            >
              Create a New Video
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (video?.status === 'processing') {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center">Video Processing</CardTitle>
            <CardDescription className="text-center">
              Your personalized AI video is being generated...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-center font-medium">
              {video.message || 'Please wait while we create your video.'}
            </p>
            {video.progress && (
              <p className="text-center text-sm text-gray-500 mt-2">
                {Math.round(video.progress * 100)}% complete
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (video?.status === 'failed') {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-center">Video Generation Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {video.errorMessage || 'Something went wrong generating your video. Please try again.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/interact')} 
              className="w-full"
              variant="default"
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">{video?.title || 'Your AI Video'}</CardTitle>
          <CardDescription className="text-center">
            {video?.prompt || 'A personalized AI video created just for you!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {video?.videoUrl ? (
            <div className="mb-6">
              <div className="aspect-[9/16] rounded-md overflow-hidden bg-black">
                <video 
                  src={video.videoUrl} 
                  className="w-full h-full object-contain" 
                  controls
                  autoPlay
                  loop
                />
              </div>
              
              <div className="flex justify-between mt-4 space-x-2">
                <Button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                
                <Button
                  onClick={handleCreateNew}
                  className="flex-1 flex items-center justify-center"
                  variant="default"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Video
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <p className="text-gray-500">Video not available</p>
            </div>
          )}
          
          {video?.videoUrl && (
            <div className="mt-6">
              <h3 className="text-center font-semibold mb-3 flex items-center justify-center">
                <Share2 className="mr-2 h-4 w-4" />
                Share Your Video
              </h3>
              
              <div className="flex justify-center space-x-4">
                <FacebookShareButton url={shareUrl}>
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                
                <TwitterShareButton url={shareUrl} title={video.prompt || "Check out my AI video from VOTA!"}>
                  <TwitterIcon size={40} round />
                </TwitterShareButton>
                
                <WhatsappShareButton url={shareUrl} title={video.prompt || "Check out my AI video from VOTA!"}>
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
                
                <TelegramShareButton url={shareUrl} title={video.prompt || "Check out my AI video from VOTA!"}>
                  <TelegramIcon size={40} round />
                </TelegramShareButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
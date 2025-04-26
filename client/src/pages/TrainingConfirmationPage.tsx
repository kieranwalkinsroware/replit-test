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
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define the upload data interface to fix type checking
interface UploadData {
  id: number;
  processingStatus?: string;
  status?: string;
  progress?: number;
  errorMessage?: string;
  message?: string;
}

export default function TrainingConfirmationPage() {
  const [match, params] = useRoute('/training-confirmation/:uploadId');
  const [, navigate] = useLocation();
  const [progress, setProgress] = useState(0);
  const [showManualContinue, setShowManualContinue] = useState(false);
  
  // Get the upload ID from the route params
  const uploadId = match ? Number(params?.uploadId) : null;
  
  // Query to fetch the upload status
  const { 
    data: upload, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery<UploadData | null>({
    queryKey: ['/api/uploads', uploadId],
    queryFn: async () => {
      if (!uploadId) return null;
      
      try {
        const response = await fetch(`/api/uploads/${uploadId}`);
        const data = await response.json();
        
        // Even if response is not OK, we want to show the error from the API if possible
        if (!response.ok && data.message) {
          console.log("API returned error:", data.message);
          return {
            ...data,
            processingStatus: 'failed',
            errorMessage: data.message || "Failed to process your video"
          } as UploadData;
        }
        
        return data as UploadData;
      } catch (err) {
        console.error("Error fetching upload status:", err);
        // Return a friendlier error response that can be displayed
        return {
          id: uploadId,
          processingStatus: 'failed',
          errorMessage: "We couldn't connect to our servers. Please try again later."
        } as UploadData;
      }
    },
    enabled: !!uploadId, // Only run the query if we have an uploadId
    refetchInterval: (queryData) => {
      // If the upload is still processing, refetch every 3 seconds
      if (queryData && typeof queryData === 'object' && queryData !== null) {
        // Safely access properties using type assertions for this specific property access
        const data = queryData as unknown as UploadData;
        const status = data.processingStatus || data.status;
        return status === 'processing' || status === 'pending' ? 3000 : false;
      }
      return false;
    }
  });
  
  // Normalize status field (API returns either processingStatus or status)
  const normalizeStatus = (uploadData: UploadData | null) => {
    if (!uploadData) return 'unknown';
    return uploadData.processingStatus || uploadData.status || 'unknown';
  };
  
  // Update the progress bar based on the status
  useEffect(() => {
    if (upload) {
      const status = normalizeStatus(upload);
      
      if (status === 'processing') {
        // Simulate progress if there's no explicit progress value
        if (upload.progress) {
          // Use server-provided progress if available
          setProgress(upload.progress);
        } else {
          // Add a forced "completion" after some time stuck at 95%
          const isStuckAt95 = progress >= 95;
          if (isStuckAt95) {
            // After a short delay at 95%, enable manual continue button
            const timer = setTimeout(() => {
              setShowManualContinue(true);
            }, 5000);
            return () => clearTimeout(timer);
          } else {
            // Normal progress simulation
            setProgress(Math.min(progress + 5, 95));
          }
        }
      } else if (status === 'completed') {
        setProgress(100);
        setShowManualContinue(false);
      } else if (status === 'failed') {
        setProgress(0);
        setShowManualContinue(false);
      } else if (status === 'pending') {
        setProgress(10); // Show minimal progress for pending
        setShowManualContinue(false);
      }
    }
  }, [upload, progress]);
  
  // Handle the continue button click
  const handleContinue = () => {
    // Allow either completed state or manual intervention to continue
    if (upload && (normalizeStatus(upload) === 'completed' || showManualContinue)) {
      // Navigate to the interact page
      navigate('/interact');
    }
  };
  
  // Handle retry
  const handleRetry = () => {
    if (uploadId) {
      // Navigate back to the camera page to try again
      navigate('/camera');
    }
  };
  
  // Determine the status message
  const getStatusMessage = () => {
    if (!upload) return 'Initializing...';
    
    const status = normalizeStatus(upload);
    
    switch (status) {
      case 'pending':
        return 'Preparing to process your video...';
      case 'processing':
        if (progress < 30) {
          return 'Analyzing your video...';
        } else if (progress < 60) {
          return 'Extracting your face...';
        } else if (progress >= 95 && showManualContinue) {
          return 'Processing is taking longer than expected, but you can continue...';
        } else {
          return 'Nearly done! Finalizing...';
        }
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return upload.errorMessage || 'Something went wrong. Please try again.';
      default:
        return upload.message || 'Processing your video...';
    }
  };
  
  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError || !uploadId) {
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
                {error?.toString() || 'Invalid upload ID. Please try again.'}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => navigate('/camera')} 
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
          <CardTitle className="text-xl font-bold text-center">Processing Your Video</CardTitle>
          <CardDescription className="text-center">
            We're preparing your video for AI-powered magic!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {getStatusMessage()}
              </span>
              <span className="text-sm font-medium">
                {progress}%
              </span>
            </div>
            
            <Progress value={progress} className="h-2" />
            
            {upload && normalizeStatus(upload) === 'processing' && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            {upload && normalizeStatus(upload) === 'completed' && (
              <div className="flex flex-col items-center py-4 space-y-2">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="text-center font-medium">
                  Your video has been processed successfully!
                </p>
              </div>
            )}
            
            {upload && normalizeStatus(upload) === 'failed' && (
              <div className="flex flex-col items-center py-4 space-y-2">
                <XCircle className="h-16 w-16 text-red-500" />
                <p className="text-center font-medium text-red-500">
                  Processing failed
                </p>
                <p className="text-center text-sm text-gray-500">
                  {upload.errorMessage || 'Something went wrong with your video processing. Please try again.'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {upload && normalizeStatus(upload) === 'completed' && (
            <Button 
              onClick={handleContinue} 
              className="w-full"
              variant="default"
              size="lg"
            >
              Continue
            </Button>
          )}
          
          {upload && normalizeStatus(upload) === 'failed' && (
            <Button 
              onClick={handleRetry} 
              className="w-full"
              variant="default"
              size="lg"
            >
              Try Again
            </Button>
          )}
          
          {upload && normalizeStatus(upload) === 'processing' && !showManualContinue && (
            <div className="text-sm text-gray-500 text-center">
              <p>This may take a minute. Please don't close this page.</p>
            </div>
          )}
          
          {/* Show manual continue button if processing is taking too long */}
          {upload && normalizeStatus(upload) === 'processing' && showManualContinue && (
            <>
              <div className="text-sm text-center">
                <p>Processing is taking longer than expected.</p>
              </div>
              <Button 
                onClick={handleContinue} 
                className="w-full"
                variant="outline"
                size="lg"
              >
                Continue Anyway
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
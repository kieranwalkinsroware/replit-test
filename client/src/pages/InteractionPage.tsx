import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EXAMPLE_PROMPTS } from '../constants';
import { apiRequest } from '../lib/queryClient';

// Form schema for video generation
const videoFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(500, 'Prompt is too long'),
  email: z.string().email('Please enter a valid email address').min(5, 'Email is required for notifications'),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().default('16:9'),
  duration: z.string().default('5'),
  cfgScale: z.string().default('7.5'),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

const aspectRatioOptions = [
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Classic (4:3)' },
];

const durationOptions = [
  { value: '5', label: '5 seconds' },
  { value: '7', label: '7 seconds' },
  { value: '10', label: '10 seconds' },
];

export default function InteractionPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Setup form with default values
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: '',
      prompt: '',
      email: '',
      negativePrompt: '',
      aspectRatio: '9:16', // Default to portrait for mobile
      duration: '5',
      cfgScale: '7.5',
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: VideoFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Add user ID to the request
      const payload = {
        ...data,
        userId: "1", // In a real app, this would come from auth - converting to string for schema compatibility
      };
      
      // Call the API to generate a video
      const response = await apiRequest<{ videoId: number; status: string }>('/api/videos', {
        method: 'POST',
        data: payload,
      });
      
      // If video generation was started successfully, navigate to the result page
      if (response && response.videoId) {
        // Invalidate any relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
        
        // Navigate to the video result page
        navigate(`/video/${response.videoId}`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error generating video:', err);
      setError('Failed to start video generation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Use an example prompt
  const useExamplePrompt = (prompt: string) => {
    form.setValue('prompt', prompt);
    form.trigger('prompt');
  };
  
  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">Create Your AI Video</CardTitle>
          <CardDescription className="text-center">
            Describe what you want to see in your personalized AI video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your video" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Prompt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you want to see in your video" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter your email for notifications" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4 pt-1">
                <FormField
                  control={form.control}
                  name="aspectRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aspect Ratio</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select aspect ratio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aspectRatioOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="negativePrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Negative Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what you don't want to see in your video" 
                        className="min-h-[60px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Video
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Need inspiration? Try these prompts:</h3>
            <div className="grid grid-cols-1 gap-2">
              {EXAMPLE_PROMPTS.map((prompt, index) => (
                <Button 
                  key={index} 
                  variant="ghost" 
                  className="justify-start h-auto py-2 px-3 text-left"
                  onClick={() => useExamplePrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
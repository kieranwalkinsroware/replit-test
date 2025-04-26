export interface User {
  id: number;
  username: string;
  loraId?: string;
  trainingStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
}

export interface Video {
  id: number;
  userId: string;
  title: string;
  prompt: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface TrainingSession {
  id: number;
  userId: string;
  videoData: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface SampleVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
}

export type AppStep = 'intro' | 'training' | 'camera' | 'training-confirmation' | 'interact' | 'result';

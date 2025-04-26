import { SampleVideo } from './types';

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: '1',
    title: 'Visit space with me',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1470&auto=format&fit=crop',
    videoUrl: '/api/sample-videos/space.mp4',
  },
  {
    id: '2',
    title: 'Go SKYDIVING',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620410669010-86d03d63bb29?q=80&w=1470&auto=format&fit=crop',
    videoUrl: '/api/sample-videos/skydiving.mp4',
  },
  {
    id: '3',
    title: 'Walk to Machu Picchu',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1470&auto=format&fit=crop',
    videoUrl: '/api/sample-videos/machu-picchu.mp4',
  },
  {
    id: '4',
    title: 'Or just take me for lunch',
    thumbnailUrl: 'https://images.unsplash.com/photo-1529417305485-480f579e7578?q=80&w=1470&auto=format&fit=crop',
    videoUrl: '/api/sample-videos/lunch.mp4',
  },
];

export const RECORDING_TIME = 10; // seconds

export const EXAMPLE_PROMPTS = [
  "Let's go SKYDIVING",
  "Take me to space",
  "Let's explore the ocean",
  "Take me to a concert"
];

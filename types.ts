

export interface UserState {
  name: string;
  mbti?: string;
  quizAnswers?: {
    stressHandling: string;
    rechargeMethod: string;
  };
  emotionalProfile?: string; // AI generated persona
  hasOnboarded: boolean;
  preferences: {
    notifications: boolean;
    aiStyle: 'Empathetic' | 'Direct' | 'Poetic'; // New: AI Persona style
    language: 'English' | 'Chinese' | 'Spanish'; // New: Interface Language
    aiEnabled: boolean; // New: Master toggle for AI features
    maxActiveGoals?: 3 | 5 | 7; // Max concurrent growth goals; default 3
  };
  // Deprecated single spiritAnimal in favor of collection
  spiritAnimal?: {
    animal: string;
    reason: string;
    image: string | null;
  };
  // New: Collection System - List of unlocked animal IDs
  unlockedAnimals: string[]; 
  
  // New: Frozen/Pending Panic Entry
  pendingFrozenEntry?: {
      timestamp: Date;
      image: string; // base64
  } | null;
}

export interface MoodEntry {
  id: string;
  timestamp: Date;
  moodType: 'Pleasant' | 'Stressful' | 'Calm' | 'Thrilled' | 'Irritating';
  emotions: string[];
  intensity: number;
  note?: string; // Summary or general note
  cause?: string; // Original cause field
  aiAnalysis?: string;
  advice?: string; 
  image?: string; 
  
  // New Fields for Deep Reflection Flow
  categories?: string[]; // e.g., 'Work', 'Relationships'
  guidanceQuestion?: string; // The AI generated deep question
  guidanceAnswer?: string; // User's answer to the deep question
  growthGoal?: {
      text: string;
      isCompleted: boolean;
      isHarvested?: boolean; // New: If true, it won't show on dashboard active list
  };
  // New Fields for Panic Mode
  bodySensations?: string[];
  voiceNote?: boolean;
  /** AI 分析出的建议情绪词（仅在选择页展示用，不持久化） */
  aiSuggestedEmotions?: string[];
}

export enum AppRoute {
  ONBOARDING_NAME = '/',
  ONBOARDING_MBTI = '/onboarding/mbti',
  ONBOARDING_QUIZ = '/onboarding/quiz',
  ONBOARDING_ANALYSIS = '/onboarding/analysis',
  DASHBOARD = '/dashboard',
  CHAT = '/chat',
  HISTORY = '/history',
  REPORT = '/report',
  INSIGHT = '/insight',
  PROFILE = '/profile',
  IMAGE_JOURNAL = '/image-journal',
  PHOTO_MOOD_SELECT = '/photo-mood-select',
  DAILY_SUMMARY = '/daily-summary',
  ANIMAL_COLLECTION = '/animal-collection', // New Collection Route
  WEEKLY_REFLECTION = '/weekly-reflection',
  GROWTH_SEED = '/growth-seed',
  SEEDS = '/seeds',
  GARDEN = '/garden',
  PHOTO_WALL = '/photo-wall',
  PANIC = '/panic',
  PANIC_REFLECT = '/panic-reflect', // New route for thawing/reviewing
  TIMELINE = '/timeline'
}

export const MOOD_COLORS = {
  Pleasant: 'bg-green-300',
  Stressful: 'bg-yellow-200',
  Calm: 'bg-blue-200',
  Thrilled: 'bg-purple-300',
  Irritating: 'bg-red-300',
};

// Hex codes for gradient generation
export const MOOD_HEX_CODES: Record<string, string> = {
  Pleasant: '#A3D133',   // Lime Green
  Stressful: '#F58E2E',  // Orange
  Calm: '#0066FF',       // Blue
  Thrilled: '#C62E93',   // Pink/Purple
  Irritating: '#4B5563', // Grey
  Neutral: '#E5E7EB'     // Light Grey
};
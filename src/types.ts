export type Language = 'English' | 'Hindi' | 'Hinglish' | 'Gujarati';
export type Style = 
  | 'High Energy' 
  | 'Premium-Luxury' 
  | 'Emotional/Storytelling' 
  | 'Bold-Confident' 
  | 'Playful-Friendly' 
  | 'Calm-ASMR'
  | 'Minimalist-Modern'
  | 'Traditional-Heritage'
  | 'Quirky-Humorous'
  | 'Inspirational-Hopeful'
  | 'Tech-Futuristic'
  | 'Corporate-Professional'
  | 'Urgent-Sale'
  | 'Mysterious-Intriguing'
  | 'Short Film Script';
export type VoiceGender = 'Male' | 'Female';
export type AspectRatio = '16:9' | '9:16' | '4:5' | '1:1' | '1.91:1';

export interface ReferenceFile {
  name: string;
  type: string;
  data: string; // base64
}

export interface UserInputs {
  companyName: string;
  highlight: string;
  duration: number;
  language: Language;
  style: Style;
  voiceGender: VoiceGender;
  referenceFiles?: ReferenceFile[];
  creativeDirection?: string;
}

export interface ScriptData {
  script: string;
  estimated_duration_seconds: number;
  tone_summary: string;
}

export interface VoiceData {
  voice_style: string;
  ssml_script: string;
  audio_processing_notes: string;
}

export interface Scene {
  scene_number: number;
  script_line: string;
  image_prompt: string;
  video_prompt: string;
  camera_motion: string;
  lighting: string;
  image_url?: string;
  video_url?: string;
  subject_image_url?: string;
}

export interface AppState {
  step: number;
  inputs: UserInputs;
  script: ScriptData | null;
  voice: VoiceData | null;
  aspectRatio: AspectRatio;
  scenes: Scene[];
  finalVideoUrl: string | null;
  isGenerating: boolean;
  error: string | null;
}

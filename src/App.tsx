/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Video, 
  Type as TypeIcon, 
  Mic, 
  Maximize,
  Loader2,
  AlertCircle,
  Clapperboard,
  Settings2,
  Image as ImageIcon,
  Upload,
  Trash2,
  Save,
  FileUp,
  CreditCard
} from 'lucide-react';
import { GeminiService } from './services/gemini';
import { AppState, UserInputs, Language, Style, VoiceGender, AspectRatio, Scene } from './types';

const gemini = new GeminiService();

const LANGUAGES: Language[] = ['English', 'Hindi', 'Hinglish', 'Gujarati'];
const STYLES: Style[] = [
  'High Energy', 
  'Premium-Luxury', 
  'Emotional/Storytelling', 
  'Bold-Confident', 
  'Playful-Friendly', 
  'Calm-ASMR',
  'Minimalist-Modern',
  'Traditional-Heritage',
  'Quirky-Humorous',
  'Inspirational-Hopeful',
  'Tech-Futuristic',
  'Corporate-Professional',
  'Urgent-Sale',
  'Mysterious-Intriguing'
];
const ASPECT_RATIOS: AspectRatio[] = ['16:9', '9:16', '4:5', '1:1', '1.91:1'];

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 1,
    inputs: {
      companyName: '',
      highlight: '',
      duration: 30,
      language: 'English',
      style: 'Premium-Luxury',
      voiceGender: 'Male',
    },
    script: null,
    voice: null,
    aspectRatio: '16:9',
    scenes: [],
    finalVideoUrl: null,
    isGenerating: false,
    error: null,
  });

  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Reset audio when script or voice settings change
  useEffect(() => {
    setVoiceAudioUrl(null);
  }, [state.script?.script, state.inputs.voiceGender, state.inputs.style]);

  const handleInputChange = (field: keyof UserInputs, value: any) => {
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, [field]: value }
    }));
  };

  const startGeneration = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const scriptData = await gemini.generateScript(state.inputs);
      setState(prev => ({ ...prev, script: scriptData, step: 2, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const downloadScript = () => {
    if (!state.script) return;
    const blob = new Blob([state.script.script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.inputs.companyName.replace(/\s+/g, '_')}_Script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateAndPlayVoice = async () => {
    if (voiceAudioUrl) {
      const audio = new Audio(voiceAudioUrl);
      audio.play();
      return;
    }

    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const audioUrl = await gemini.generateVoice(
        state.script!.script, 
        state.inputs.style, 
        state.inputs.voiceGender
      );
      setVoiceAudioUrl(audioUrl);
      const audio = new Audio(audioUrl);
      audio.play();
      setState(prev => ({ ...prev, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const downloadAudio = () => {
    if (!voiceAudioUrl) return;
    const a = document.createElement('a');
    a.href = voiceAudioUrl;
    a.download = `${state.inputs.companyName.replace(/\s+/g, '_')}_Voiceover.wav`;
    a.click();
  };

  const approveScript = async () => {
    if (!voiceAudioUrl) {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));
      try {
        const audioUrl = await gemini.generateVoice(
          state.script!.script, 
          state.inputs.style, 
          state.inputs.voiceGender
        );
        setVoiceAudioUrl(audioUrl);
        setState(prev => ({ ...prev, step: 3, isGenerating: false }));
      } catch (err: any) {
        setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
        return;
      }
    } else {
      setState(prev => ({ ...prev, step: 3 }));
    }
  };

  const generateScenes = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const scenes = await gemini.generateScenes(
        state.inputs,
        state.script!.script,
        state.aspectRatio
      );
      setState(prev => ({ ...prev, scenes, step: 4, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const generateVideoForScene = async (index: number) => {
    const scene = state.scenes[index];
    if (scene.video_url) return;

    const newScenes = [...state.scenes];
    setState(prev => ({ ...prev, isGenerating: true }));
    
    try {
      const videoUrl = await gemini.generateVideoScene(scene, state.aspectRatio);
      newScenes[index] = { ...scene, video_url: videoUrl };
      setState(prev => ({ ...prev, scenes: newScenes, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const generateImageForScene = async (index: number) => {
    const scene = state.scenes[index];
    const newScenes = [...state.scenes];
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const imageUrl = await gemini.generateImage(scene, state.aspectRatio);
      newScenes[index] = { ...scene, image_url: imageUrl };
      setState(prev => ({ ...prev, scenes: newScenes, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const regeneratePromptForScene = async (index: number) => {
    const scene = state.scenes[index];
    setState(prev => ({ ...prev, isGenerating: true, error: null }));
    
    try {
      const newPrompts = await gemini.regenerateScenePrompt(state.inputs, scene, state.aspectRatio);
      const newScenes = [...state.scenes];
      newScenes[index] = { 
        ...scene, 
        image_prompt: newPrompts.image_prompt, 
        video_prompt: newPrompts.video_prompt,
        video_url: undefined
      };
      setState(prev => ({ ...prev, scenes: newScenes, isGenerating: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isGenerating: false }));
    }
  };

  const handlePromptChange = (index: number, newPrompt: string) => {
    const newScenes = [...state.scenes];
    newScenes[index] = { ...newScenes[index], image_prompt: newPrompt };
    setState(prev => ({ ...prev, scenes: newScenes }));
  };

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - state.referenceImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState(prev => ({
          ...prev,
          referenceImages: [...prev.referenceImages, reader.result as string]
        }));
      };
      reader.readAsDataURL(file as File);
    });
  };

  const removeReferenceImage = (index: number) => {
    setState(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== index)
    }));
  };

  const downloadImage = (url: string, index: number) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scene_${index + 1}_Image.png`;
    a.click();
  };

  const saveProject = () => {
    const projectData = {
      inputs: state.inputs,
      script: state.script,
      aspectRatio: state.aspectRatio,
      scenes: state.scenes.map(s => ({
        ...s,
        image_url: s.image_url?.startsWith('data:') ? s.image_url : null, // Only save base64 images
        video_url: null, // Blob URLs won't persist
      })),
      step: state.step
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TeaserCraft_Project_${state.inputs.companyName.replace(/\s+/g, '_') || 'Untitled'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target?.result as string);
        setState(prev => ({
          ...prev,
          ...projectData,
          isGenerating: false,
          error: null
        }));
      } catch (err) {
        setState(prev => ({ ...prev, error: 'Failed to load project file.' }));
      }
    };
    reader.readAsText(file);
  };

  const connectPaidAccount = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
    } catch (err: any) {
      setState(prev => ({ ...prev, error: 'Failed to open account selection.' }));
    }
  };

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-serif italic gradient-text">TeaserCraft</h1>
        <p className="text-zinc-400 text-lg">Cinematic AI Video Production for Brands</p>
      </div>

      <div className="glass p-8 rounded-3xl space-y-6">
        <div className="space-y-4">
          <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Company Name</label>
          <input 
            type="text"
            value={state.inputs.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="e.g. Zurich Luxury Watches"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zurich-gold transition-colors"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Key Message / Highlight</label>
          <textarea 
            value={state.inputs.highlight}
            onChange={(e) => handleInputChange('highlight', e.target.value)}
            placeholder="What makes this special?"
            rows={3}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zurich-gold transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Duration (Seconds)</label>
            <input 
              type="number"
              value={state.inputs.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              min={15}
              max={180}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zurich-gold transition-colors"
            />
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Language</label>
            <select 
              value={state.inputs.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zurich-gold transition-colors"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Style</label>
            <select 
              value={state.inputs.style}
              onChange={(e) => handleInputChange('style', e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-zurich-gold transition-colors"
            >
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Voice Gender</label>
            <div className="flex gap-2">
              {(['Male', 'Female'] as VoiceGender[]).map(g => (
                <button
                  key={g}
                  onClick={() => handleInputChange('voiceGender', g)}
                  className={`flex-1 py-3 rounded-xl border transition-all ${state.inputs.voiceGender === g ? 'bg-zurich-gold text-black border-zurich-gold' : 'border-white/10 hover:border-white/30'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={startGeneration}
          disabled={!state.inputs.companyName || !state.inputs.highlight || state.isGenerating}
          className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zurich-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Craft Initial Script
        </button>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <button onClick={() => setState(p => ({ ...p, step: 1 }))} className="text-zinc-500 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Inputs
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={downloadScript}
            className="text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-zurich-gold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Script
          </button>
          <div className="flex items-center gap-2 text-zurich-gold">
            <TypeIcon className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">Script Review</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl min-h-[400px] relative group">
            <h2 className="text-2xl font-serif italic mb-6">The Script</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg">
              {state.script?.script}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Audio Preview</h3>
            
            <div className="space-y-3">
              <button 
                onClick={generateAndPlayVoice}
                disabled={state.isGenerating}
                className="w-full bg-zinc-900 border border-white/10 py-4 rounded-xl flex items-center justify-center gap-2 hover:border-zurich-gold transition-all group"
              >
                {state.isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4 group-hover:fill-zurich-gold" />}
                {voiceAudioUrl ? 'Listen Again' : 'Listen to Voiceover'}
              </button>

              {voiceAudioUrl && (
                <button 
                  onClick={downloadAudio}
                  className="w-full border border-white/10 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-xs font-mono uppercase tracking-widest text-zinc-400"
                >
                  <Download className="w-4 h-4" />
                  Download Audio
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={approveScript}
              disabled={state.isGenerating}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zurich-gold transition-colors"
            >
              {state.isGenerating ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Approve & Proceed
            </button>
            <button 
              onClick={startGeneration}
              disabled={state.isGenerating}
              className="w-full border border-white/10 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const handleSubjectImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newScenes = [...state.scenes];
      newScenes[index] = { ...newScenes[index], subject_image_url: reader.result as string };
      setState(prev => ({ ...prev, scenes: newScenes }));
    };
    reader.readAsDataURL(file);
  };

  const removeSubjectImage = (index: number) => {
    const newScenes = [...state.scenes];
    newScenes[index] = { ...newScenes[index], subject_image_url: undefined };
    setState(prev => ({ ...prev, scenes: newScenes }));
  };

  const renderStep3 = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <button onClick={() => setState(p => ({ ...p, step: 2 }))} className="text-zinc-500 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Script
        </button>
        <div className="text-center flex-1">
          <h2 className="text-4xl font-serif italic">Size & Format</h2>
          <p className="text-zinc-500">Finalize the technical details</p>
        </div>
        <div className="w-24" /> {/* Spacer */}
      </div>

      <div className="glass p-8 rounded-3xl space-y-8">
        <div className="space-y-4">
          <label className="block text-xs font-mono uppercase tracking-widest text-zinc-500">Aspect Ratio</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ASPECT_RATIOS.map(ratio => (
              <button
                key={ratio}
                onClick={() => setState(p => ({ ...p, aspectRatio: ratio }))}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${state.aspectRatio === ratio ? 'bg-zurich-gold text-black border-zurich-gold' : 'border-white/10 hover:border-white/30'}`}
              >
                <div className={`border-2 border-current mb-2 ${
                  ratio === '16:9' ? 'w-8 h-4.5' :
                  ratio === '9:16' ? 'w-4.5 h-8' :
                  ratio === '4:5' ? 'w-5 h-6' :
                  ratio === '1:1' ? 'w-6 h-6' : 'w-8 h-4'
                }`} />
                <span className="text-[10px] font-mono">{ratio}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={generateScenes}
          disabled={state.isGenerating}
          className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-zurich-gold transition-colors"
        >
          {state.isGenerating ? <Loader2 className="animate-spin" /> : <Clapperboard className="w-5 h-5" />}
          Generate Scene Breakdown
        </button>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => setState(p => ({ ...p, step: 3 }))} className="text-zinc-500 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-3xl font-serif italic">Image Generation</h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setState(p => ({ ...p, step: 5 }))}
            className="bg-zurich-gold text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform"
          >
            Next: Video Production
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.scenes.map((scene, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass rounded-3xl overflow-hidden group flex flex-col"
          >
            <div className="aspect-video bg-zinc-900 relative flex items-center justify-center cursor-pointer overflow-hidden" onClick={() => scene.image_url && setPreviewImageUrl(scene.image_url)}>
              {scene.image_url ? (
                <img src={scene.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="text-center p-6 space-y-4">
                  <ImageIcon className="w-8 h-8 mx-auto text-zinc-700" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); generateImageForScene(idx); }}
                    disabled={state.isGenerating}
                    className="text-xs font-mono uppercase tracking-widest text-zurich-gold hover:underline disabled:opacity-50"
                  >
                    Generate Preview
                  </button>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono">
                SCENE {scene.scene_number}
              </div>
              {scene.image_url && (
                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); generateImageForScene(idx); }}
                    className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadImage(scene.image_url!, idx); }}
                    className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="p-6 space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Subject Image</p>
                <div className="flex items-center gap-3">
                  {scene.subject_image_url ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                      <img src={scene.subject_image_url} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeSubjectImage(idx)}
                        className="absolute top-0 right-0 bg-black/50 p-0.5 rounded-bl-lg text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-12 h-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-zurich-gold transition-colors">
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleSubjectImageUpload(idx, e)}
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-zinc-500 italic">Optional per-scene subject reference</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Image Prompt</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => regeneratePromptForScene(idx)}
                      disabled={state.isGenerating}
                      className="text-[10px] text-zurich-gold font-mono hover:underline disabled:opacity-50"
                    >
                      REGENERATE
                    </button>
                    <span className="text-[10px] text-zinc-600 font-mono">EDITABLE</span>
                  </div>
                </div>
                <textarea 
                  value={scene.image_prompt}
                  onChange={(e) => handlePromptChange(idx, e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-zurich-gold transition-colors resize-none italic"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => setState(p => ({ ...p, step: 4 }))} className="text-zinc-500 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-3xl font-serif italic">Video Production</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
            <Settings2 className="w-4 h-4" />
            {state.aspectRatio}
          </div>
          <button 
            onClick={() => setState(p => ({ ...p, step: 6 }))}
            className="bg-zurich-gold text-black px-6 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform"
          >
            Finalize Video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.scenes.map((scene, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass rounded-3xl overflow-hidden group"
          >
            <div className="aspect-video bg-zinc-900 relative flex items-center justify-center overflow-hidden">
              {scene.video_url ? (
                <video src={scene.video_url} controls className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full relative flex items-center justify-center">
                  {scene.image_url && (
                    <img src={scene.image_url} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" />
                  )}
                  <div className="relative z-10 text-center p-6 space-y-4">
                    <Video className="w-8 h-8 mx-auto text-zurich-gold" />
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => generateVideoForScene(idx)}
                        disabled={state.isGenerating}
                        className="text-xs font-mono uppercase tracking-widest text-white bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 hover:bg-zurich-gold hover:text-black transition-all disabled:opacity-50"
                      >
                        {state.isGenerating ? 'Processing...' : 'Generate Cinematic Clip'}
                      </button>
                      <button 
                        onClick={() => regeneratePromptForScene(idx)}
                        disabled={state.isGenerating}
                        className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-zurich-gold transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Regenerate Safer Prompt
                      </button>
                    </div>
                    {scene.image_url && (
                      <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Using Generated Image as Start Frame</p>
                    )}
                  </div>
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono">
                SCENE {scene.scene_number}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300 line-clamp-2 italic">"{scene.script_line}"</p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Motion</p>
                  <p className="text-[11px] text-zinc-400">{scene.camera_motion}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Lighting</p>
                  <p className="text-[11px] text-zinc-400">{scene.lighting}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStep6 = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto text-center space-y-12"
    >
      <div className="flex justify-start">
        <button onClick={() => setState(p => ({ ...p, step: 5 }))} className="text-zinc-500 hover:text-white flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Production
        </button>
      </div>
      <div className="space-y-4">
        <div className="w-20 h-20 bg-zurich-gold rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(212,175,55,0.3)]">
          <CheckCircle2 className="w-10 h-10 text-black" />
        </div>
        <h2 className="text-5xl font-serif italic">Production Complete</h2>
        <p className="text-zinc-400 max-w-lg mx-auto">Your cinematic masterpiece is ready for the world. Download and share across your platforms.</p>
      </div>

      <div className="glass p-12 rounded-[3rem] space-y-8">
        <div className="aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* In a real app, we'd combine the clips here. For the demo, we show the first clip or a placeholder */}
          {state.scenes[0]?.video_url ? (
            <video src={state.scenes[0].video_url} controls className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-12 h-12 text-zinc-800" />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-white text-black px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zurich-gold transition-colors">
            <Download className="w-5 h-5" />
            Download 4K Master
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, step: 1, scenes: [], script: null, voice: null }))}
            className="border border-white/10 px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            New Project
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Navigation Rail */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zurich-gold rounded-lg flex items-center justify-center text-black font-bold text-xl">Z</div>
          <span className="font-serif italic text-xl tracking-tight">Zurich</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border ${state.step >= s ? 'bg-zurich-gold border-zurich-gold text-black' : 'border-white/20 text-zinc-500'}`}>
                {s}
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-widest ${state.step >= s ? 'text-white' : 'text-zinc-600'}`}>
                {['Inputs', 'Script', 'Voice', 'Images', 'Video', 'Export'][s-1]}
              </span>
              {s < 6 && <div className="w-4 h-[1px] bg-white/10 ml-2" />}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={connectPaidAccount}
            className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors"
            title="Connect Paid Google Cloud Project"
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden lg:block">Connect Paid Account</span>
          </button>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <button 
            onClick={saveProject}
            className="flex items-center gap-2 text-zinc-500 hover:text-zurich-gold transition-colors"
            title="Save Project"
          >
            <Save className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden lg:block">Save</span>
          </button>
          <label 
            className="flex items-center gap-2 text-zinc-500 hover:text-zurich-gold transition-colors cursor-pointer"
            title="Load Project"
          >
            <FileUp className="w-5 h-5" />
            <span className="text-[10px] font-mono uppercase tracking-widest hidden lg:block">Load</span>
            <input type="file" className="hidden" accept=".json" onChange={loadProject} />
          </label>
          <div className="w-[1px] h-8 bg-white/10 mx-2" />
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono text-zinc-500 uppercase">System Status</p>
            <p className="text-[10px] font-mono text-emerald-500">All Engines Online</p>
          </div>
        </div>
      </nav>

      <main className="pt-32 px-6">
        <AnimatePresence mode="wait">
          {state.step === 1 && renderStep1()}
          {state.step === 2 && renderStep2()}
          {state.step === 3 && renderStep3()}
          {state.step === 4 && renderStep4()}
          {state.step === 5 && renderStep5()}
          {state.step === 6 && renderStep6()}
        </AnimatePresence>
      </main>

      {/* Error Toast */}
      <AnimatePresence>
        {state.error && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 glass border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-400 z-[100]"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{state.error}</span>
            <button onClick={() => setState(p => ({ ...p, error: null }))} className="ml-4 text-zinc-500 hover:text-white">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-8"
            onClick={() => setPreviewImageUrl(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewImageUrl} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10" />
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white flex items-center gap-2 text-xs font-mono uppercase tracking-widest"
              >
                Close Preview
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Loader Overlay */}
      <AnimatePresence>
        {state.isGenerating && state.step === 4 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <Loader2 className="w-16 h-16 text-zurich-gold animate-spin" />
              <Video className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-serif italic">Generating Cinematic Clip</h3>
              <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Veo Engine is processing your request...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

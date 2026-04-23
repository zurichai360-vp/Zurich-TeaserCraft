import { GoogleGenAI, Type, Modality } from "@google/genai";
import { UserInputs, ScriptData, Scene, AspectRatio, VoiceGender } from "../types";

const MODEL_TEXT = "gemini-3.1-pro-preview";
const MODEL_IMAGE = "gemini-3.1-flash-image-preview";
const MODEL_VIDEO = "veo-3.1-generate-preview";
const MODEL_TTS = "gemini-2.5-flash-preview-tts";

export class GeminiService {
  private getApiKey(): string {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key not found. Please configure it in the Secrets panel.");
    return key;
  }

  private getAiInstance(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: this.getApiKey() });
  }

  async generateScript(inputs: UserInputs): Promise<ScriptData> {
    const ai = this.getAiInstance();
    const prompt = `Generate a cinematic video script for:
    Company: ${inputs.companyName}
    Message: ${inputs.highlight}
    Duration: ${inputs.duration}s
    Language: ${inputs.language}
    Style: ${inputs.style}
    Voice: ${inputs.voiceGender}`;

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            estimated_duration_seconds: { type: Type.NUMBER },
            tone_summary: { type: Type.STRING }
          },
          required: ["script", "estimated_duration_seconds", "tone_summary"]
        },
        systemInstruction: `You are Zurich – TeaserCraft's Lead Copywriter, an elite Indian advertising expert with the creative depth of Ogilvy and Leo Burnett. Your goal is to create high-conversion, emotionally compelling voice-over scripts.

STRICT PRINCIPLES:
1. LANGUAGE: Natural, conversational, and culturally relevant for Indian audiences (urban & semi-urban). No robotic or formal jargon.
2. HOOK: 2-3 seconds that grab attention using curiosity or bold statements.
3. STRUCTURE: Hook -> Problem -> Relatable Buildup -> Solution -> Specific Benefits -> Trust/Social Proof -> Strong CTA.
4. QUALITY: No fluff, short impactful sentences, rhythmic flow for voice delivery. 
5. NICHE: Adapt tone perfectly to ${inputs.style} and the company's industry.
6. EMOTIONAL IMPACT: Use FOMO, aspiration, or relief.
7. FORMAT: Return ONLY the spoken dialogue in the 'script' field. No scene numbers, labels, or visual descriptions. Use line breaks optimized for breathing.
8. DURATION: Strictly match ${inputs.duration} seconds.
9. QUALITY BAR: Must feel ready for a top-tier Indian brand ad without edits.

Output JSON only.`
      }
    });

    return JSON.parse(response.text || "{}");
  }

  async generateVoice(script: string, style: string, gender: VoiceGender): Promise<string> {
    const ai = this.getAiInstance();
    const voiceName = gender === 'Male' ? 'Fenrir' : 'Kore';
    
    // Enhanced prompt for deep, expressive, and appealing quality
    const enhancedPrompt = `
      Perform this script as a professional cinematic voiceover artist.
      Tone: ${style}
      Voice Quality: Deep, resonant, appealing, and highly expressive.
      Instructions: Use natural pacing with dramatic pauses where appropriate. Ensure the delivery feels premium and emotionally resonant.
      
      Script:
      ${script}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text: enhancedPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      // Add WAV header for raw PCM 16-bit 24kHz
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const wavHeader = this.createWavHeader(len, 24000);
      const wavBytes = new Uint8Array(wavHeader.length + bytes.length);
      wavBytes.set(wavHeader);
      wavBytes.set(bytes, wavHeader.length);

      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    }
    throw new Error("Failed to generate voiceover");
  }

  private createWavHeader(dataLength: number, sampleRate: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + dataLength, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  async generateScenes(inputs: UserInputs, script: string, aspectRatio: AspectRatio): Promise<Scene[]> {
    const ai = this.getAiInstance();
    const prompt = `Break this script into cinematic scenes for a ${aspectRatio} video. 
    Company Name: ${inputs.companyName}
    Industry & Services: ${inputs.highlight}
    Visual Style: ${inputs.style}
    Script: ${script}`;

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scene_number: { type: Type.NUMBER },
                  script_line: { type: Type.STRING },
                  image_prompt: { type: Type.STRING },
                  video_prompt: { type: Type.STRING },
                  camera_motion: { type: Type.STRING },
                  lighting: { type: Type.STRING }
                },
                required: ["scene_number", "script_line", "image_prompt", "video_prompt", "camera_motion", "lighting"]
              }
            }
          },
          required: ["scenes"]
        },
        systemInstruction: `You are a cinematic director. Break the script into logical scenes. 
        CRITICAL: Visual prompts (image_prompt and video_prompt) MUST be perfectly aligned with the company's industry and services: "${inputs.highlight}". 
        Avoid generic stock-photo descriptions. If it's a luxury watch brand, show craftsmanship and elegance. If it's a tech startup, show innovation and modern workspace. 
        Ensure the visuals reflect the brand's unique value proposition. 
        SAFETY: Avoid any prompts that could trigger safety filters (no violence, no copyrighted characters, no sensitive public figures, no medical/legal advice visuals). Keep descriptions professional and brand-safe.
        The aspect ratio is ${aspectRatio}, so describe compositions that fit this frame. 
        Output JSON only.`
      }
    });

    const data = JSON.parse(response.text || "{}");
    return data.scenes;
  }

  async regenerateScenePrompt(inputs: UserInputs, scene: Scene, aspectRatio: AspectRatio): Promise<{ image_prompt: string, video_prompt: string }> {
    const ai = this.getAiInstance();
    
    const parts: any[] = [
      { text: `The previous prompts for this scene were blocked by safety filters. Generate new, safer, and more professional cinematic visual prompts for:
      Company Name: ${inputs.companyName}
      Industry & Services: ${inputs.highlight}
      Script Line: ${scene.script_line}
      Original Image Prompt: ${scene.image_prompt}
      Original Video Prompt: ${scene.video_prompt}` }
    ];

    // Include the current generated image as context if it exists
    if (scene.image_url) {
      parts.push({
        inlineData: {
          data: scene.image_url.split(',')[1],
          mimeType: "image/png"
        }
      });
      parts.push({ text: "MANDATORY: Use the provided image as the visual reference. The new prompts must describe this image accurately but in a way that is safe and professional." });
    }

    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            image_prompt: { type: Type.STRING },
            video_prompt: { type: Type.STRING }
          },
          required: ["image_prompt", "video_prompt"]
        },
        systemInstruction: `You are a cinematic director. Generate ultra-safe, professional, and brand-appropriate visual prompts. 
        CRITICAL: Avoid any elements that could trigger safety filters. No people (unless essential and generic), no violence, no copyrighted items, no intense action, no sensitive symbols. 
        Focus on abstract beauty, high-end product shots, architectural elegance, or nature. 
        Ensure the visuals are perfectly aligned with the company's industry: "${inputs.highlight}".
        Output JSON only.`
      }
    });

    return JSON.parse(response.text || "{}");
  }

  async generateImage(scene: Scene, aspectRatio: AspectRatio): Promise<string> {
    const ai = this.getAiInstance();
    
    const parts: any[] = [
      { text: `Generate a high-quality cinematic image. 
      Scene Description: ${scene.image_prompt}
      Lighting/Atmosphere: ${scene.lighting}
      STRICT Aspect Ratio: ${aspectRatio}. Ensure the composition is perfectly centered and optimized for this specific size.` }
    ];

    // Add scene-specific subject image if available
    if (scene.subject_image_url) {
      parts.push({
        inlineData: {
          data: scene.subject_image_url.split(',')[1],
          mimeType: "image/png"
        }
      });
      parts.push({ text: "MANDATORY: The provided subject image is the primary focus. Incorporate it accurately into the environment." });
    }

    const response = await ai.models.generateContent({
      model: MODEL_IMAGE,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: this.mapImageAspectRatio(aspectRatio)
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Failed to generate image: No image data returned.");
  }

  private mapImageAspectRatio(ratio: AspectRatio): string {
    switch (ratio) {
      case '16:9': return '16:9';
      case '9:16': return '9:16';
      case '1:1': return '1:1';
      case '4:5': return '3:4'; // Closest supported by Imagen 3.1
      case '1.91:1': return '16:9'; // Closest
      default: return '16:9';
    }
  }

  private mapVideoAspectRatio(ratio: AspectRatio): '16:9' | '9:16' {
    // Veo strictly supports 16:9 and 9:16
    if (ratio === '9:16' || ratio === '4:5') return '9:16';
    return '16:9';
  }

  async generateVideoScene(scene: Scene, aspectRatio: AspectRatio): Promise<string> {
    // Check for API key selection for Veo
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }

    // Re-init to use latest key
    const ai = this.getAiInstance();

    const videoAspectRatio = this.mapVideoAspectRatio(aspectRatio);
    const videoConfig: any = {
      model: MODEL_VIDEO,
      prompt: scene.video_prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: videoAspectRatio
      }
    };

    // Use generated image as starting frame ONLY if aspect ratios match
    const isSupportedRatio = aspectRatio === '16:9' || aspectRatio === '9:16';
    if (scene.image_url && isSupportedRatio) {
      videoConfig.image = {
        imageBytes: scene.image_url.split(',')[1],
        mimeType: 'image/png'
      };
    }

    let operation;
    try {
      operation = await ai.models.generateVideos(videoConfig);
    } catch (err: any) {
      console.error("Initial Video Request Error:", err);
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
        throw new Error("API Key session expired. Please select your paid project 'Zurich Atelier AI' again and retry.");
      }
      throw err;
    }

    // Polling with detailed logging
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
      console.log("Video Generation Polling Status:", { done: operation.done, name: operation.name });
    }

    if (operation.error) {
      console.error("Video Operation Error:", operation.error);
      if (operation.error.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
        throw new Error("API Key session expired. Please select your paid project 'Zurich Atelier AI' again and retry.");
      }
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    console.log("Full Video Operation Response:", JSON.stringify(operation, null, 2));

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      const response = operation.response || {};
      const isFiltered = response.raiMediaFilteredCount > 0 || response.raiMediaFilteredReasons;
      
      if (isFiltered) {
        throw new Error("Video generation blocked by safety filters. The prompt or generated content may contain restricted elements. Please try adjusting the scene description or prompt.");
      }

      const state = JSON.stringify({
        done: operation.done,
        hasResponse: !!operation.response,
        responseKeys: operation.response ? Object.keys(operation.response) : [],
        videosCount: operation.response?.generatedVideos?.length,
        metadata: operation.metadata
      });
      throw new Error(`Video generation failed: No download link returned. State: ${state}`);
    }

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': this.getApiKey(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Generated video blob is empty.");
    
    return URL.createObjectURL(blob);
  }
}

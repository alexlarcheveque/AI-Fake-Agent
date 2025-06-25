import { ElevenLabsClient, play } from "@elevenlabs/elevenlabs-js";
import logger from "../utils/logger.ts";

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

// Default voice settings for real estate agents
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.8,
  style: 0.2,
  use_speaker_boost: true,
};

export interface VoiceGenerationOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

/**
 * Generate speech audio from text using ElevenLabs
 */
export const generateSpeech = async (
  text: string,
  options: VoiceGenerationOptions = {}
): Promise<Buffer> => {
  try {
    const voiceId =
      options.voiceId ||
      process.env.ELEVENLABS_DEFAULT_VOICE_ID ||
      "21m00Tcm4TlvDq8ikWAM"; // Default voice

    logger.info(
      `Generating speech with ElevenLabs for text: "${text.substring(
        0,
        100
      )}..."`
    );

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: options.stability ?? DEFAULT_VOICE_SETTINGS.stability,
        similarityBoost:
          options.similarityBoost ?? DEFAULT_VOICE_SETTINGS.similarity_boost,
        style: options.style ?? DEFAULT_VOICE_SETTINGS.style,
        useSpeakerBoost:
          options.useSpeakerBoost ?? DEFAULT_VOICE_SETTINGS.use_speaker_boost,
      },
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }

    const audioBuffer = Buffer.concat(chunks);
    logger.info(`Generated ${audioBuffer.length} bytes of audio`);

    return audioBuffer;
  } catch (error) {
    logger.error("Error generating speech with ElevenLabs:", error);
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
};

/**
 * Get available voices from ElevenLabs
 */
export const getAvailableVoices = async () => {
  try {
    const voices = await elevenlabs.voices.getAll();

    // Filter for English voices suitable for business calls
    const businessVoices = voices.voices.filter(
      (voice) =>
        voice.labels?.category?.includes("professional") ||
        voice.labels?.category?.includes("conversational") ||
        voice.name.toLowerCase().includes("professional") ||
        voice.name.toLowerCase().includes("business")
    );

    return businessVoices.length > 0
      ? businessVoices
      : voices.voices.slice(0, 10);
  } catch (error) {
    logger.error("Error fetching ElevenLabs voices:", error);
    throw new Error(`Failed to fetch voices: ${error.message}`);
  }
};

/**
 * Get voice details by ID
 */
export const getVoiceById = async (voiceId: string) => {
  try {
    const voice = await elevenlabs.voices.get(voiceId);
    return voice;
  } catch (error) {
    logger.error(`Error fetching voice ${voiceId}:`, error);
    throw new Error(`Failed to fetch voice: ${error.message}`);
  }
};

/**
 * Test voice generation with a sample text
 */
export const testVoice = async (
  voiceId: string,
  sampleText: string = "Hello, this is a test of the voice calling system."
) => {
  try {
    const audioBuffer = await generateSpeech(sampleText, { voiceId });
    return {
      success: true,
      audioSize: audioBuffer.length,
      sampleText,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      sampleText,
    };
  }
};

export default {
  generateSpeech,
  getAvailableVoices,
  getVoiceById,
  testVoice,
};

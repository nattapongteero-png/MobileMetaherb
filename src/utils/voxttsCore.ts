// The VoxCPM request, separated from playback so the voice pipeline is testable
// headless: voxtts.ts (native playback) and the live voice tests send EXACTLY
// this request — one definition, no drift between what ships and what's tested.
import { AI_TTS_BASE, AI_TTS_MODEL, AI_TTS_VOICE, AI_TTS_SPEED } from "../config/aiEndpoints";

export const TTS_URL = `${AI_TTS_BASE}/v1/audio/speech`;

/** The exact request the assistant speaks with (Thai male voice, WAV out). */
export function ttsRequestInit(text: string): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/wav" },
    body: JSON.stringify({
      model: AI_TTS_MODEL,
      input: text,
      voice: AI_TTS_VOICE,
      response_format: "wav",
      speed: AI_TTS_SPEED,
    }),
  };
}

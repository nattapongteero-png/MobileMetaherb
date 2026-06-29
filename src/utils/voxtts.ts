// Thai text-to-speech via VoxCPM (OpenAI-compatible /v1/audio/speech).
// Mirrors utils/elevenlabs.ts: fetch audio → base64 → cache file → play via expo-audio.
import * as FileSystem from "expo-file-system/legacy";
import { requireOptionalNativeModule } from "expo-modules-core";
import { AI_TTS_BASE, AI_TTS_MODEL, AI_TTS_VOICE, AI_TTS_SPEED } from "../config/aiEndpoints";

// Lazily load expo-audio only when its native module is present (guarded).
let _audio: typeof import("expo-audio") | null | undefined;
function getAudio() {
  if (_audio !== undefined) return _audio;
  if (!requireOptionalNativeModule("ExpoAudio")) { _audio = null; return _audio; }
  try { _audio = require("expo-audio") as typeof import("expo-audio"); } catch { _audio = null; }
  return _audio;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("read failed"));
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    r.readAsDataURL(blob);
  });
}

let counter = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let player: any = null;

export function stopVox() {
  try { player?.remove(); } catch { /* noop */ }
  player = null;
}

/** Speak `text` with VoxCPM (Thai). Resolves false if unavailable/failed so the
 *  caller can fall back to another voice. `onDone` fires when playback ends. */
export async function voxSpeak(text: string, onDone: () => void): Promise<boolean> {
  const A = getAudio();
  if (!A || !text.trim()) return false;
  try {
    const res = await fetch(`${AI_TTS_BASE}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav" },
      body: JSON.stringify({
        model: AI_TTS_MODEL,
        input: text,
        voice: AI_TTS_VOICE,
        response_format: "wav",
        speed: AI_TTS_SPEED,
      }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const b64 = await blobToBase64(blob);
    const uri = `${FileSystem.cacheDirectory}meta_vox_${counter++}.wav`;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    try { A.setAudioModeAsync({ playsInSilentMode: true }); } catch { /* noop */ }
    stopVox();
    player = A.createAudioPlayer({ uri });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = player.addListener("playbackStatusUpdate", (s: any) => {
      if (s?.didJustFinish) { try { sub.remove(); } catch { /* noop */ } onDone(); }
    });
    player.play();
    return true;
  } catch {
    return false;
  }
}

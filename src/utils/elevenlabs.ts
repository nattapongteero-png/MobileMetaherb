import * as FileSystem from "expo-file-system/legacy";
import { requireOptionalNativeModule } from "expo-modules-core";
import { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL } from "../config/aiVoice";

export const hasElevenLabs = () => !!ELEVENLABS_API_KEY;

// Lazily load expo-audio only when its native module is present (guarded).
let _audio: typeof import("expo-audio") | null | undefined;
function getAudio() {
  if (_audio !== undefined) return _audio;
  if (!requireOptionalNativeModule("ExpoAudio")) { _audio = null; return _audio; }
  try { _audio = require("expo-audio") as typeof import("expo-audio"); } catch { _audio = null; }
  return _audio;
}

// Binary response → base64 (RN-safe, no Buffer) via FileReader.
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

export function stopEleven() {
  try { player?.remove(); } catch { /* noop */ }
  player = null;
}

/** Speak `text` with ElevenLabs; resolves false if unavailable/failed so the
 *  caller can fall back to the system voice. `onDone` fires when playback ends. */
export async function elevenSpeak(text: string, onDone: () => void): Promise<boolean> {
  const A = getAudio();
  if (!ELEVENLABS_API_KEY || !A) return false;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
        }),
      },
    );
    if (!res.ok) return false;
    const blob = await res.blob();
    const b64 = await blobToBase64(blob);
    const uri = `${FileSystem.cacheDirectory}meta_tts_${counter++}.mp3`;
    await FileSystem.writeAsStringAsync(uri, b64, { encoding: FileSystem.EncodingType.Base64 });
    try { A.setAudioModeAsync({ playsInSilentMode: true }); } catch { /* noop */ }
    stopEleven();
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

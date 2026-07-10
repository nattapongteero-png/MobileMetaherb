/**
 * The voice conversation, end to end and headless (AI_LIVE=1):
 *
 *   speak → VoxCPM TTS → real WAV → Whisper ASR → text → safety chain →
 *   metaChat answer → TTS again → audio the app would play.
 *
 * The trick: the TTS output IS the ASR input, so the whole loop runs with no
 * microphone and no speaker. The TTS request comes from voxttsCore — the same
 * bytes the app sends, not a test-only copy.
 *
 * The ASR endpoint exists but the app still transcribes on-device, so its
 * request shape is probed; if the server refuses every known Whisper shape the
 * round-trip skips honestly rather than failing the suite.
 */
import { describe, expect, it } from "vitest";
import { TTS_URL, ttsRequestInit } from "../src/utils/voxttsCore";
import { AI_ASR_BASE } from "../src/config/aiEndpoints";
import { extractCautions, extractGoals } from "../src/data/aiEngine";
import { metaChat } from "../src/services/metaAI";

const LIVE = process.env.AI_LIVE === "1";
const d = LIVE ? describe : describe.skip;
const T = 180_000;

const isWav = (buf: ArrayBuffer) => {
  const b = new Uint8Array(buf);
  const tag = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  return tag(0) === "RIFF" && tag(8) === "WAVE";
};

async function tts(text: string): Promise<ArrayBuffer> {
  const res = await fetch(TTS_URL, ttsRequestInit(text));
  expect(res.status, "TTS endpoint").toBe(200);
  return res.arrayBuffer();
}

/** Whisper-compatible transcription; probes the model-name variants servers use. */
async function asr(wav: ArrayBuffer): Promise<string | null> {
  for (const model of ["whisper-1", "whisper", undefined]) {
    const form = new FormData();
    form.append("file", new Blob([wav], { type: "audio/wav" }), "voice.wav");
    if (model) form.append("model", model);
    form.append("language", "th");
    const res = await fetch(`${AI_ASR_BASE}/v1/audio/transcriptions`, { method: "POST", body: form });
    if (!res.ok) continue;
    const json = (await res.json()) as { text?: string };
    if (typeof json.text === "string") return json.text;
  }
  return null;
}

d("the assistant's voice", () => {
  it("speaks Thai as real WAV audio — the exact request the app sends", async () => {
    const wav = await tts("สวัสดีครับ ผมเมต้า ยินดีให้บริการครับ");
    console.log(`\n🔊 TTS: ${(wav.byteLength / 1024).toFixed(0)} KB of audio`);
    expect(isWav(wav)).toBe(true);
    expect(wav.byteLength).toBeGreaterThan(10_000); // a real utterance, not a stub
  }, T);
});

d("the full voice conversation loop", () => {
  it("TTS → ASR → safety chain → answer → TTS", async (ctx) => {
    // 1. The "customer speaks" — synthesised, so no microphone is needed.
    const spokenWav = await tts("ผมนอนไม่หลับ กินอะไรดีครับ");
    expect(isWav(spokenWav)).toBe(true);

    // 2. The app hears it back.
    const heard = await asr(spokenWav);
    if (heard === null) {
      console.log("\n⏭  ASR endpoint accepted no known Whisper shape — round-trip skipped");
      ctx.skip();
      return;
    }
    console.log(`\n🎤 ได้ยินว่า: "${heard}"`);
    expect(heard).toMatch(/นอน|หลับ/); // the symptom survived the audio round-trip

    // 3. The transcript drives the SAME safety chain as typed text.
    const goals = extractGoals(heard);
    expect(goals).toContain("sleep");
    const reply = await metaChat([{ role: "user", text: heard }], undefined, undefined, goals, extractCautions(heard));
    console.log(`🤖 ${reply}`);
    expect(reply).toMatch(/ครับ/);
    expect(reply).not.toMatch(/แนะนำ[^.]*?(กาแฟ|ชาอู|อเมริกาโน)/); // the guard holds for voice too

    // 4. …and the answer becomes audio the app would play.
    const answerWav = await tts(reply);
    expect(isWav(answerWav)).toBe(true);
    expect(answerWav.byteLength).toBeGreaterThan(10_000);
    console.log(`🔊 คำตอบเป็นเสียง: ${(answerWav.byteLength / 1024).toFixed(0)} KB`);
  }, T);
});

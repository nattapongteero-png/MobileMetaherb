// BMS Cloud AI endpoints (OpenAI-compatible). Open endpoints — if your servers
// require a token, add an Authorization header in the service/util files.

// LLM brain — Gemma-4 (vLLM, OpenAI-compatible /v1/chat/completions)
export const AI_LLM_BASE = "https://vllm-gemma.bmscloud.in.th";
export const AI_LLM_MODEL = "gemma4";

// Speech-to-text (Whisper-compatible /v1/audio/transcriptions)
export const AI_ASR_BASE = "https://asr2.bmscloud.in.th";

// Thai text-to-speech (VoxCPM, OpenAI-compatible /v1/audio/speech)
export const AI_TTS_BASE = "https://vox-cpm.bmscloud.in.th";
export const AI_TTS_MODEL = "voxcpm-thai";
// Voice presets — male: male · male_boga · male_eugene · male_kostas · male_takis
//                female: female · female_alma · female_martha · female_niki · female_sofia
export const AI_TTS_VOICE = "male_eugene"; // หนุ่ม โทนเบาๆ น่ารัก
export const AI_TTS_SPEED = 1.06; // เร่งจังหวะนิดให้ฟังสดใส/น่ารักขึ้น

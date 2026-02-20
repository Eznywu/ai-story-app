// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import { VOICES } from "@/lib/voices";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const {
      text,
      speed = 0.95,
      emotion = 40, // 你前端是 0-100
      voiceId: voiceKey,
      language = "zh-Hant",
    } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const fallbackVoiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    // Resolve ElevenLabs voice id (hardwritten list first, env fallback)
    let resolvedElevenVoiceId = fallbackVoiceId;
    if (voiceKey) {
      const hit = VOICES.find((v) => v.id === String(voiceKey));
      if (!hit?.elevenId) {
        return NextResponse.json({ error: "Selected voice not found" }, { status: 400 });
      }
      resolvedElevenVoiceId = hit.elevenId;
    }
    if (!resolvedElevenVoiceId) {
      return NextResponse.json({ error: "Missing ELEVENLABS_VOICE_ID" }, { status: 500 });
    }

    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // -------------------------
    // A) 中文文本前處理 + 常錯字替換
    // -------------------------
    const isZh = String(language).toLowerCase().startsWith("zh");

    let cleanedText = String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      // 中文標點後不要帶多餘空白（避免怪斷句）
      .replace(/([，。！？；：、])\s*/g, "$1")
      // 英文標點後補一個空格（可選，避免黏在一起）
      .replace(/([,.!?;:])\s*/g, "$1 ")
      .replace(/[ \t]{2,}/g, " ")
      .trim();

    // 你可以把「常被念錯」的詞加在這裡（左：原文；右：你希望它更好念的寫法）
    // 注意：中文 TTS 很吃 voice，本質不是 100% 可控；但這種替換常常很有感。
    const zhFixMap: Array<[RegExp, string]> = [
      // 範例：角色名、品牌名、外來語
      // [/嚕嚕/g, "露露"], // 例：如果「嚕嚕」被念怪，可以試試同音字
      // [/AI/g, "A I"],   // 例：縮寫拆開
    ];
    if (isZh) {
      for (const [re, rep] of zhFixMap) cleanedText = cleanedText.replace(re, rep);
    }

    // -------------------------
    // B) 參數：中文用更保守映射（更像真人、少卡頓）
    // -------------------------
    // ElevenLabs voice settings & speed 參數是官方支持的：style/speed 等 :contentReference[oaicite:1]{index=1}
    const s = Math.max(0.78, Math.min(1.08, Number(speed))); // 中文建議稍微窄一點

    // UI emotion 0-100 -> 0-1
    let eNum = Number(emotion);
    if (!Number.isFinite(eNum)) eNum = 40;
    const e01 = Math.max(0, Math.min(1, eNum > 1 ? eNum / 100 : eNum));

    // 中文：避免 style 過高 + stability 過低（最容易造成“不順/怪腔”）
    // 你原本是 style 0.15..0.95 / stability 0.65..0.20（中文很容易太飄）
    // 改成：style 0.10..0.45 / stability 0.72..0.45（更穩、更口語自然）
    const stability = isZh ? (0.72 - e01 * 0.27) : (0.65 - e01 * 0.45);
    const style = isZh ? (0.10 + e01 * 0.35) : (0.15 + e01 * 0.8);

    // similarity_boost：太高有時會“咬字硬”，中文可略降一點試試
    const similarity_boost = isZh ? 0.78 : 0.85;

    // -------------------------
    // C) 連貫度：可選 previous_text / next_text（官方建議用於更自然的語流）:contentReference[oaicite:2]{index=2}
    // 這裡先用同一段的前後少量上下文（不切段也能幫助模型做更好的語氣連結）
    const prev = cleanedText.slice(0, 120);
    const next = cleanedText.slice(-120);

    const body: any = {
      text: cleanedText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost: true,
      },
      speed: s,
      // 可選：語流連貫（尤其長文/多段落更有用）
      previous_text: prev,
      next_text: next,
      // 可選：seed 讓同一段文字多次生成更穩（仍可能有細微差）:contentReference[oaicite:3]{index=3}
      seed: 42,
    };

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedElevenVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify(body),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await r.arrayBuffer());
    return new NextResponse(audioBuffer, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
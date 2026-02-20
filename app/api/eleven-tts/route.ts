// app/api/eleven-tts/route.ts
import { NextResponse } from "next/server";
import { VOICES } from "@/lib/voices";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, speed = 0.95, emotion = 0.65, voiceId: voiceKey } =
      await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const fallbackVoiceId = process.env.ELEVENLABS_VOICE_ID;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_API_KEY" },
        { status: 500 }
      );
    }

    // Resolve ElevenLabs voice id (hardwritten list first, env fallback)
    let resolvedElevenVoiceId = fallbackVoiceId;

    if (voiceKey) {
      const hit = VOICES.find((v) => v.id === String(voiceKey));
      if (!hit?.elevenId) {
        return NextResponse.json(
          { error: "Selected voice not found" },
          { status: 400 }
        );
      }
      resolvedElevenVoiceId = hit.elevenId;
    }

    if (!resolvedElevenVoiceId) {
      return NextResponse.json(
        { error: "Missing ELEVENLABS_VOICE_ID" },
        { status: 500 }
      );
    }

    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // clamp to safe ranges
    const s = Math.max(0.7, Math.min(1.2, Number(speed)));

    // your UI uses emotion 0–100, convert to 0–1 if needed
    let eNum = Number(emotion);
    if (Number.isFinite(eNum) && eNum > 1) eNum = eNum / 100;
    const e = Math.max(0, Math.min(1, eNum));

    const stability = 0.65 - e * 0.45; // 0.65..0.20
    const style = 0.15 + e * 0.8;      // 0.15..0.95

    const body: any = {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost: 0.85,
        style,
        use_speaker_boost: true,
      },
      speed: s,
    };

    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedElevenVoiceId}`,
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
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
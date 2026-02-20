import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, speed = 0.95, emotion = 0.65 } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!apiKey) return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    if (!voiceId) return NextResponse.json({ error: "Missing ELEVENLABS_VOICE_ID" }, { status: 500 });

    // clamp to safe ranges
    const s = Math.max(0.7, Math.min(1.2, Number(speed)));
    const e = Math.max(0, Math.min(1, Number(emotion)));

    // Map "emotion" to voice settings:
    // higher emotion -> lower stability + higher style
    const stability = 0.65 - e * 0.45; // emotion 0..1 => 0.65..0.20
    const style = 0.15 + e * 0.80;     // emotion 0..1 => 0.15..0.95

    const body: any = {
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability,
        similarity_boost: 0.85,
        style,
        use_speaker_boost: true,
      },
      // Speed is supported in some configurations. If your account/model rejects it,
      // you'll see an error and we can remove it.
      speed: s,
    };

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    });

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
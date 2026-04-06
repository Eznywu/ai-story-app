import { NextResponse } from "next/server";
import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { isMemberRequest } from "@/lib/memberGate";

export const runtime = "nodejs";

function readableElevenLabsCloneError(body: string): string | null {
  try {
    const j = JSON.parse(body) as { detail?: unknown };
    const detail = j.detail;
    if (!detail || typeof detail !== "object" || Array.isArray(detail)) return null;
    const status = (detail as { status?: string }).status;
    const message = (detail as { message?: string }).message;
    if (status === "missing_permissions") {
      if (
        typeof message === "string" &&
        message.toLowerCase().includes("create_instant_voice_clone")
      ) {
        return [
          "Instant voice cloning is not enabled for this ElevenLabs API key.",
          "Fix: use a paid plan that includes Voice Cloning, or in the ElevenLabs dashboard create an API key with permission to create instant voice clones (not a restricted “TTS-only” key).",
          "Then update ELEVENLABS_API_KEY and try again.",
        ].join(" ");
      }
      if (typeof message === "string" && message.trim()) return message.trim();
    }
    if (typeof message === "string" && message.trim()) return message.trim();
  } catch {
    return null;
  }
  return null;
}

function errorBodyFromElevenLabsError(err: ElevenLabsError): string {
  if (typeof err.body === "string") return err.body;
  if (err.body != null) {
    try {
      return JSON.stringify(err.body);
    } catch {
      return "";
    }
  }
  return "";
}

export async function POST(req: Request) {
  try {
    if (!isMemberRequest(req)) {
      return NextResponse.json(
        { error: "Voice cloning requires membership." },
        { status: 403 }
      );
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size < 512) {
      return NextResponse.json({ error: "Recording too short—try a few seconds of clear speech." }, { status: 400 });
    }

    const customName = formData.get("name");
    const languageHint = formData.get("language");

    const voiceName =
      (typeof customName === "string" && customName.trim()
        ? customName.trim()
        : `Bedtime clone ${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`) ||
      "Bedtime clone";

    const labels =
      typeof languageHint === "string" && languageHint.trim()
        ? JSON.stringify({
            language: languageHint.toLowerCase().startsWith("zh") ? "chinese" : "english",
          })
        : undefined;

    const client = new ElevenLabsClient({ apiKey });

    try {
      const result = await client.voices.ivc.create({
        name: voiceName,
        files: [file],
        ...(labels ? { labels } : {}),
      });

      return NextResponse.json({
        voiceId: result.voiceId,
        requiresVerification: result.requiresVerification,
      });
    } catch (err) {
      if (err instanceof ElevenLabsError) {
        const raw = errorBodyFromElevenLabsError(err);
        const httpStatus =
          err.statusCode != null && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
        const errorMessage =
          readableElevenLabsCloneError(raw) || raw.trim() || err.message || "ElevenLabs voice clone failed";
        return NextResponse.json({ error: errorMessage }, { status: httpStatus });
      }
      throw err;
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err, "Clone failed") }, { status: getErrorStatus(err, 500) });
  }
}

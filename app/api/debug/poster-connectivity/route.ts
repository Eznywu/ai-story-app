import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { fetch } from "undici";
import { getErrorMessage } from "@/lib/errors";
import {
  getGeminiBaseUrl,
  getOpenAiBaseUrl,
  getPosterHttpDispatcher,
  posterProxyConfigured,
  posterProxyMode,
} from "@/lib/providerHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.POSTER_CONNECTIVITY_TIMEOUT_MS) || 20_000, 5_000),
  120_000
);

function openAiApiKey(): string | undefined {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey || undefined;
}

function geminiApiKey(): string | undefined {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return apiKey || undefined;
}

async function testOpenAi() {
  const apiKey = openAiApiKey();
  if (!apiKey) {
    return { ok: false, message: "Missing OPENAI_API_KEY" };
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: getOpenAiBaseUrl(),
      timeout: TEST_TIMEOUT_MS,
      maxRetries: 0,
      fetchOptions: { dispatcher: getPosterHttpDispatcher(TEST_TIMEOUT_MS) },
    });
    const result = await client.models.list();
    return {
      ok: Array.isArray(result.data),
      message: Array.isArray(result.data) ? "Reachable" : "Unexpected OpenAI response shape",
    };
  } catch (err: unknown) {
    return { ok: false, message: getErrorMessage(err, "OpenAI connectivity check failed") };
  }
}

async function testGemini() {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return { ok: false, message: "Missing GEMINI_API_KEY / GOOGLE_API_KEY" };
  }

  try {
    const baseUrl = (getGeminiBaseUrl() ?? "https://generativelanguage.googleapis.com").replace(
      /\/$/,
      ""
    );
    const response = await fetch(`${baseUrl}/v1beta/models`, {
      method: "GET",
      dispatcher: getPosterHttpDispatcher(TEST_TIMEOUT_MS),
      headers: {
        "x-goog-api-key": apiKey,
      },
    });
    const text = await response.text();
    return {
      ok: response.ok,
      message: response.ok ? "Reachable" : `HTTP ${response.status}: ${text.slice(0, 180)}`,
    };
  } catch (err: unknown) {
    return { ok: false, message: getErrorMessage(err, "Gemini connectivity check failed") };
  }
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const [openai, gemini] = await Promise.all([testOpenAi(), testGemini()]);
  return NextResponse.json({
    ok: openai.ok || gemini.ok,
    transport: {
      proxyConfigured: posterProxyConfigured(),
      proxyMode: posterProxyMode(),
      openAiBaseUrlConfigured: Boolean(getOpenAiBaseUrl()),
      geminiBaseUrlConfigured: Boolean(getGeminiBaseUrl()),
      timeoutMs: TEST_TIMEOUT_MS,
    },
    openai,
    gemini,
  });
}

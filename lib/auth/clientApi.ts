import { redirectIfUnsigned } from "@/lib/auth/redirectIfUnsigned";

export async function clientJson<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (redirectIfUnsigned(res.status)) {
    throw new Error(data.error || "Sign in to continue.");
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

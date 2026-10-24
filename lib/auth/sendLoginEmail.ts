import { allowDevCodeLog } from "@/lib/auth/config";

const RESEND_URL = "https://api.resend.com/emails";

export function emailDeliveryProblem(): string | null {
  if (process.env.RESEND_API_KEY?.trim()) return null;
  if (allowDevCodeLog()) return null;
  return "Email sign-in is not configured. Set RESEND_API_KEY.";
}

/**
 * Sends the code with Resend when `RESEND_API_KEY` is set.
 * Local `next dev` without a key prints the code on the server console.
 * Production and Vercel never print the code; a missing key is an error.
 */
export async function deliverLoginCode(email: string, code: string): Promise<void> {
  const problem = emailDeliveryProblem();
  if (problem) {
    throw new Error(problem);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info(`[auth] dev login code for ${email}: ${code}`);
    return;
  }

  const from = process.env.AUTH_EMAIL_FROM?.trim() || "Happy Horse <onboarding@resend.dev>";
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your sign-in code",
      text: [
        `Your sign-in code is ${code}.`,
        "It expires in 10 minutes and can only be used once.",
        "If you did not ask for this, you can ignore this email.",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[auth] Resend rejected the login email", res.status, detail.slice(0, 300));
    throw new Error("We couldn't send the email. Try again in a moment.");
  }
}

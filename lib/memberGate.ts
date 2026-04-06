import { getSessionFromRequest } from "@/lib/authSession";
import { isDefaultStoryText } from "@/lib/defaultStory";

export function isMemberRequest(req: Request): boolean {
  const s = getSessionFromRequest(req);
  return Boolean(s && s.m === 1);
}

export function isLoggedInRequest(req: Request): boolean {
  return Boolean(getSessionFromRequest(req));
}

/** Guests may only synthesize speech for the configured default story text. */
export function canUseTtsForText(req: Request, text: string): boolean {
  if (isMemberRequest(req)) return true;
  return isDefaultStoryText(String(text ?? ""));
}

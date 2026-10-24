import { jsonNoStore } from "@/lib/auth/requireUser";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return jsonNoStore({ user });
}

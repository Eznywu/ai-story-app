import fs from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth/requireUser";
import { userOwnsMedia } from "@/lib/auth/ownedStory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const url = new URL(req.url);
    const filename = decodeURIComponent(url.pathname.split("/").pop() || "");

    const isSafe =
      filename.length > 0 &&
      !filename.includes("..") &&
      !filename.includes("/") &&
      !filename.includes("\\") &&
      filename.endsWith(".png") &&
      /^poster_[a-z0-9_]+\.png$/i.test(filename);

    if (!isSafe) {
      return new Response(JSON.stringify({ error: "Invalid filename" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const owned = await userOwnsMedia(auth.user.id, "poster", filename);
    if (!owned) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const filePath = path.join(process.cwd(), "uploads", "posters", filename);
    const data = await fs.readFile(filePath);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
